import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import PricingSummary from "../components/PricingSummary";
import { formatDateTime } from "../lib/dateFormatting";
import { getOrderArtworkNames } from "../lib/orderArtwork";
import { updateStoredOrder, useStoredOrders } from "../lib/ordersStore";
import { normalizeOrderFinancials } from "../orders/orderFinancials";
import {
  canAdvanceQuoteStatus,
  getNextQuoteStatus,
  isQuoteArchived,
  isQuoteReadyForProduction,
} from "../quotes/quoteWorkflow";
import {
  buildApprovalStatus,
  buildDepositStatus,
  buildProductionReadiness,
} from "../quotes/productionReadiness";

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatValue(value, fallback = "—") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function formatList(values = [], fallback = "—") {
  const items = Array.from(new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean)));
  return items.length ? items.join(", ") : fallback;
}

function cardStyle(background = "#ffffff") {
  return {
    background,
    borderRadius: "20px",
    padding: "22px",
    border: "1px solid #e2e8f0",
  };
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: 800 }}>{label}</p>
      <strong style={{ display: "block", marginTop: "6px", color: "#171717" }}>{value || "—"}</strong>
    </div>
  );
}

function StatusPill({ children, tone = "default" }) {
  const tones = {
    default: { background: "#f8fafc", border: "#e2e8f0", color: "#0f172a" },
    warning: { background: "#fff7ed", border: "#fed7aa", color: "#9a3412" },
    success: { background: "#ecfdf5", border: "#bbf7d0", color: "#166534" },
  };
  const palette = tones[tone] || tones.default;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        padding: "8px 12px",
        background: palette.background,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        fontWeight: 800,
        fontSize: "12px",
      }}
    >
      {children}
    </span>
  );
}

function WorkspaceCard({ eyebrow, title, description, children, background = "#ffffff" }) {
  return (
    <section style={cardStyle(background)}>
      <div style={{ marginBottom: "16px" }}>
        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </p>
        <h2 style={{ margin: "6px 0 4px", color: "#0f172a", fontSize: "20px" }}>{title}</h2>
        {description ? <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function QuoteDetail() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const orders = useStoredOrders();
  const savedOrder = location.state?.savedOrder || null;
  const order = useMemo(
    () =>
      orders.find((entry) => entry.order_number === orderNumber) ||
      (savedOrder?.order_number === orderNumber ? savedOrder : null),
    [orderNumber, orders, savedOrder]
  );
  const quoteSnapshot = order?.quote || null;
  const flashMessage = location.state?.flashMessage || "";
  const flashTone = location.state?.flashTone || "default";
  const financials = useMemo(
    () =>
      order
        ? normalizeOrderFinancials(order, {
            additionalSources: quoteSnapshot ? [{ label: "storedQuote", value: quoteSnapshot }] : [],
          })
        : null,
    [order, quoteSnapshot]
  );
  const depositStatus = useMemo(() => buildDepositStatus(order, financials), [order, financials]);
  const approvalStatus = useMemo(() => buildApprovalStatus(order), [order]);
  const productionReadiness = useMemo(
    () => buildProductionReadiness(order, financials),
    [order, financials]
  );
  const artworkNames = useMemo(() => getOrderArtworkNames(order), [order]);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const archived = isQuoteArchived(order);
  const archivedAt = archived ? formatDateTime(order.quote_archived_at, " • ") : "—";
  const readinessSummary = productionReadiness.ready
    ? "Ready for production"
    : `${productionReadiness.remainingRequirements} requirement${productionReadiness.remainingRequirements === 1 ? "" : "s"} remaining`;
  const nextStep = archived
    ? "Archived from active workflow"
    : canAdvanceQuoteStatus(order?.quote_status)
    ? `Mark ${getNextQuoteStatus(order.quote_status)}`
    : isQuoteReadyForProduction(order?.quote_status)
    ? "Release to Production"
    : "Await remaining quote requirements";

  if (!order) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
        <h1>Quote not found</h1>
        <Link to="/admin/quotes">Back to Quotes</Link>
      </div>
    );
  }

  function handleAdvanceQuote() {
    if (archived) return;
    if (!canAdvanceQuoteStatus(order.quote_status)) return;

    const nextQuoteStatus = getNextQuoteStatus(order.quote_status);
    updateStoredOrder(order.order_number, {
      quote_status: nextQuoteStatus,
      activity_type: "quote_status",
      activity_note: `Quote status changed to ${nextQuoteStatus}.`,
    });
  }

  function handleReleaseToProduction() {
    if (archived) return;
    if (!isQuoteReadyForProduction(order.quote_status)) return;

    updateStoredOrder(order.order_number, {
      quote_status: "Ready For Production",
      status: "Awaiting Production",
      operational_visible: true,
      production_ready: true,
      activity_type: "release_to_production",
      activity_note: "Quote released into Production Orders.",
    });
  }

  function handleArchiveQuote() {
    if (archived) return;

    updateStoredOrder(order.order_number, {
      quote_archived: true,
      quote_archived_at: new Date().toISOString(),
      operational_visible: false,
      production_ready: false,
      activity_type: "quote_archive",
      activity_note: "Quote archived from active workflow.",
    });

    setShowArchiveConfirm(false);
    navigate("/admin/quotes", {
      state: {
        flashTitle: "Quote Archived",
        flashMessage: `Quote ${order.order_number} was removed from active workflow.`,
        flashTone: "success",
      },
    });
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      {flashMessage ? (
        <section
          aria-live="polite"
          style={{
            marginBottom: "20px",
            borderRadius: "16px",
            padding: "16px 18px",
            border: flashTone === "success" ? "1px solid #bbf7d0" : "1px solid #cbd5e1",
            background: flashTone === "success" ? "#ecfdf5" : "#f8fafc",
            color: flashTone === "success" ? "#166534" : "#334155",
            fontWeight: 700,
          }}
        >
          {flashMessage}
        </section>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Quote Detail Workspace
          </p>
          <h1 style={{ margin: "6px 0" }}>Quote {order.order_number}</h1>
          <p style={{ margin: 0, color: "#475569", maxWidth: "760px" }}>
            Focused operational workspace for approvals, readiness, pricing, artwork, and production release.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            to="/admin/quotes"
            style={{
              background: "#ffffff",
              color: "#171717",
              border: "1px solid #d6dbe4",
              borderRadius: "12px",
              padding: "11px 14px",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            {archived ? "Back to Active Quotes" : "Back to Quotes"}
          </Link>
          {canAdvanceQuoteStatus(order.quote_status) ? (
            <button
              type="button"
              onClick={handleAdvanceQuote}
              disabled={archived}
              style={{
                border: "none",
                background: "#0f172a",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "11px 14px",
                fontWeight: 700,
                cursor: archived ? "not-allowed" : "pointer",
                opacity: archived ? 0.55 : 1,
              }}
            >
              Mark {getNextQuoteStatus(order.quote_status)}
            </button>
          ) : null}
          {isQuoteReadyForProduction(order.quote_status) ? (
            <button
              type="button"
              onClick={handleReleaseToProduction}
              disabled={archived}
              style={{
                border: "none",
                background: "#166534",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "11px 14px",
                fontWeight: 700,
                cursor: archived ? "not-allowed" : "pointer",
                opacity: archived ? 0.55 : 1,
              }}
            >
              Release to Production
            </button>
          ) : null}
          {!archived ? (
            <button
              type="button"
              onClick={() => setShowArchiveConfirm((current) => !current)}
              style={{
                border: "1px solid #d6dbe4",
                background: "#f8fafc",
                color: "#0f172a",
                borderRadius: "12px",
                padding: "11px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Archive from Active Workflow
            </button>
          ) : null}
        </div>
      </div>

      {archived ? (
        <section
          aria-live="polite"
          style={{
            marginBottom: "20px",
            borderRadius: "18px",
            padding: "18px 20px",
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: "#334155",
            display: "grid",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <StatusPill>Archived</StatusPill>
            <strong style={{ color: "#0f172a" }}>This quote has been removed from active workflow.</strong>
          </div>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            It no longer appears as active operational work or in quote workflow queues.
          </p>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Archived {archivedAt}</p>
        </section>
      ) : null}

      <div style={{ display: "grid", gap: "18px" }}>
        <WorkspaceCard
          eyebrow="Workspace Focus"
          title="Operational quote management"
          description="This route keeps quote-critical decisions visible at all times. It does not collapse like the list view."
          background="#f8fafc"
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            <StatusPill tone={isQuoteReadyForProduction(order.quote_status) ? "success" : "default"}>
              {order.quote_status}
            </StatusPill>
            {archived ? <StatusPill>Archived</StatusPill> : null}
            <StatusPill tone={depositStatus === "Deposit received" ? "success" : "warning"}>
              {depositStatus}
            </StatusPill>
            <StatusPill tone={approvalStatus === "Approved" ? "success" : "warning"}>
              {approvalStatus}
            </StatusPill>
            <StatusPill tone={productionReadiness.ready ? "success" : "warning"}>
              {readinessSummary}
            </StatusPill>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
            }}
          >
            <DetailItem label="Customer" value={order.customer_name} />
            <DetailItem label="Company" value={order.customer_company} />
            <DetailItem label="Quote Status" value={order.quote_status} />
            <DetailItem label="Production Readiness" value={readinessSummary} />
            <DetailItem label="Customer Approval" value={approvalStatus} />
            <DetailItem label="Deposit" value={depositStatus} />
            <DetailItem label="Source" value={order.source} />
            <DetailItem label="Due Date" value={order.due_date} />
            <DetailItem
              label="Workflow Visibility"
              value={archived ? "Removed from active workflow" : "Active operational workflow"}
            />
            {archived ? <DetailItem label="Archived At" value={archivedAt} /> : null}
            <DetailItem
              label="Artwork"
              value={productionReadiness.checks.find((check) => check.label === "Artwork")?.detail || "No artwork required"}
            />
            <DetailItem label="Next workflow step" value={nextStep} />
          </div>
        </WorkspaceCard>

        <WorkspaceCard
          eyebrow="Workflow Visibility"
          title={archived ? "Archived record" : "Active quote workflow control"}
          description={
            archived
              ? "This record is preserved for reference, but it is no longer treated as active operational work."
              : "Archive completed quotes out of active workflow once they should no longer appear in operational queues."
          }
          background={archived ? "#f8fafc" : "#ffffff"}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(260px, 0.8fr)",
              gap: "16px",
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <StatusPill>{archived ? "Archived" : "Active workflow"}</StatusPill>
                {!archived ? <StatusPill tone="warning">Visible in active quote queue</StatusPill> : null}
              </div>
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                {archived
                  ? "Archived quotes stay viewable here while remaining out of active workflow and operational queue views."
                  : "Archiving removes this quote from the active quote workflow and operational queue visibility without changing the underlying record."}
              </p>
              {archived ? (
                <p style={{ margin: 0, color: "#64748b", fontWeight: 600 }}>Archived {archivedAt}</p>
              ) : null}
            </div>

            {archived ? (
              <div
                style={{
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  padding: "16px",
                  display: "grid",
                  gap: "8px",
                }}
              >
                <strong style={{ color: "#0f172a" }}>Removed from active work</strong>
                <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                  This quote is archived and no longer appears as active operational work.
                </p>
              </div>
            ) : (
              <div
                style={{
                  borderRadius: "16px",
                  border: `1px solid ${showArchiveConfirm ? "#cbd5e1" : "#e2e8f0"}`,
                  background: showArchiveConfirm ? "#f8fafc" : "#ffffff",
                  padding: "16px",
                  display: "grid",
                  gap: "10px",
                }}
              >
                <strong style={{ color: "#0f172a" }}>Archive from active workflow</strong>
                <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                  Move this quote out of active operational workflow while keeping the full record available.
                </p>
                {showArchiveConfirm ? (
                  <>
                    <div
                      style={{
                        borderRadius: "12px",
                        border: "1px solid #d6dbe4",
                        background: "#ffffff",
                        padding: "12px 14px",
                        color: "#334155",
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      Archive this quote from active workflow?
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={handleArchiveQuote}
                        style={{
                          border: "none",
                          background: "#0f172a",
                          color: "#ffffff",
                          borderRadius: "12px",
                          padding: "11px 14px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Confirm Archive
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowArchiveConfirm(false)}
                        style={{
                          border: "1px solid #d6dbe4",
                          background: "#ffffff",
                          color: "#334155",
                          borderRadius: "12px",
                          padding: "11px 14px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Keep Active
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowArchiveConfirm(true)}
                    style={{
                      border: "1px solid #d6dbe4",
                      background: "#ffffff",
                      color: "#334155",
                      borderRadius: "12px",
                      padding: "11px 14px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Archive Quote
                  </button>
                )}
              </div>
            )}
          </div>
        </WorkspaceCard>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, 0.9fr)",
            gap: "18px",
          }}
        >
          <WorkspaceCard
            eyebrow="Readiness"
            title="Production release requirements"
            description={
              productionReadiness.ready
                ? "All release requirements are satisfied."
                : "Resolve the remaining requirements below before moving this quote into production."
            }
            background={productionReadiness.ready ? "#ecfdf5" : "#fff7ed"}
          >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: "14px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: productionReadiness.ready ? "#166534" : "#9a3412",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Production Readiness
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  color: productionReadiness.ready ? "#166534" : "#7c2d12",
                  lineHeight: 1.6,
                  fontWeight: 700,
                }}
              >
                {productionReadiness.ready
                  ? "This quote has everything needed to move into production."
                  : "This section shows what is still required before this quote can move into production."}
              </p>
            </div>
            <StatusPill tone={productionReadiness.ready ? "success" : "warning"}>
              {readinessSummary}
            </StatusPill>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            {productionReadiness.checks.map((check) => (
              <div
                key={check.label}
                style={{
                  borderRadius: "14px",
                  padding: "14px",
                  border: `1px solid ${check.passed ? "#bbf7d0" : "#fed7aa"}`,
                  background: check.passed ? "#f0fdf4" : "#fffaf0",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: check.passed ? "#166534" : "#9a3412",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {check.label}
                </p>
                <strong
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: check.passed ? "#166534" : "#7c2d12",
                  }}
                >
                  {check.detail}
                </strong>
              </div>
            ))}
          </div>
          </WorkspaceCard>

          <WorkspaceCard
            eyebrow="Release Workflow"
            title="Move the quote forward"
            description="Production release actions stay visible here instead of being hidden behind an accordion preview."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
                marginBottom: "18px",
              }}
            >
              <DetailItem label="Approval status" value={approvalStatus} />
              <DetailItem label="Deposit status" value={depositStatus} />
              <DetailItem label="Next action" value={nextStep} />
              <DetailItem
                label="Release gate"
                value={productionReadiness.ready ? "Eligible for production release" : "Blocked by requirements"}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {canAdvanceQuoteStatus(order.quote_status) ? (
                <button
                  type="button"
                  onClick={handleAdvanceQuote}
                  disabled={archived}
                  style={{
                    border: "none",
                    background: "#0f172a",
                    color: "#ffffff",
                    borderRadius: "12px",
                    padding: "11px 14px",
                    fontWeight: 700,
                    cursor: archived ? "not-allowed" : "pointer",
                    opacity: archived ? 0.55 : 1,
                  }}
                >
                  Mark {getNextQuoteStatus(order.quote_status)}
                </button>
              ) : null}
              {isQuoteReadyForProduction(order.quote_status) ? (
                <button
                  type="button"
                  onClick={handleReleaseToProduction}
                  disabled={archived}
                  style={{
                    border: "none",
                    background: "#166534",
                    color: "#ffffff",
                    borderRadius: "12px",
                    padding: "11px 14px",
                    fontWeight: 700,
                    cursor: archived ? "not-allowed" : "pointer",
                    opacity: archived ? 0.55 : 1,
                  }}
                >
                  Release to Production
                </button>
              ) : null}
              {archived ? (
                <StatusPill>Archived record</StatusPill>
              ) : (
                <span style={{ color: "#64748b", fontSize: "14px", fontWeight: 600 }}>
                  Archive control stays in Workflow Visibility so it remains deliberate and easy to find.
                </span>
              )}
            </div>
          </WorkspaceCard>
        </div>

        <WorkspaceCard
          eyebrow="Approvals And Artwork"
          title="Customer sign-off and art visibility"
          description="Artwork, placements, and customer-facing details remain visible while you manage the quote."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <DetailItem label="Customer" value={formatValue(order.customer_name, "Walk-in Customer")} />
            <DetailItem label="Garment" value={formatValue(order.garment, "Custom garment")} />
            <DetailItem label="Decoration Type" value={formatValue(order.decoration_type)} />
            <DetailItem label="Quantity" value={formatValue(order.qty, "0")} />
            <DetailItem
              label="Placements"
              value={formatList((order.placements || []).map((entry) => entry.placement))}
            />
            <DetailItem
              label="Artwork files"
              value={formatList(artworkNames, "No artwork uploaded")}
            />
            <DetailItem label="Artwork approval" value={approvalStatus} />
            <DetailItem
              label="Artwork readiness"
              value={productionReadiness.checks.find((check) => check.label === "Artwork")?.detail || "No artwork required"}
            />
          </div>
          {order.notes ? (
            <div style={{ marginTop: "16px" }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: 800 }}>Notes</p>
              <p style={{ margin: "6px 0 0", color: "#171717" }}>{order.notes}</p>
            </div>
          ) : null}
        </WorkspaceCard>

        <WorkspaceCard
          eyebrow="Pricing"
          title="Pricing and payment position"
          description="Financial visibility stays persistent in the detail workspace so quote decisions are made with current pricing context."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              marginBottom: "18px",
            }}
          >
            <DetailItem label="Quote Total" value={money(financials?.total_amount)} />
            <DetailItem label="Deposit Target" value={money(financials?.deposit_amount)} />
            <DetailItem label="Paid To Date" value={money(financials?.amount_paid)} />
            <DetailItem label="Balance Owing" value={money(financials?.balance_due)} />
          </div>

          {quoteSnapshot ? (
            <PricingSummary quote={quoteSnapshot} quantity={order.qty} />
          ) : (
            <p style={{ margin: 0, color: "#64748b" }}>
              Quote pricing snapshot will appear here once pricing data is available.
            </p>
          )}
        </WorkspaceCard>

      </div>
    </div>
  );
}
