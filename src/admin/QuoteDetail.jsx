import { Link, useLocation, useParams } from "react-router-dom";
import { useMemo } from "react";
import PricingSummary from "../components/PricingSummary";
import { updateStoredOrder, useStoredOrders } from "../lib/ordersStore";
import { normalizeOrderFinancials } from "../orders/orderFinancials";
import {
  canAdvanceQuoteStatus,
  getNextQuoteStatus,
  isQuoteReadyForProduction,
} from "../quotes/quoteWorkflow";

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
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

function buildDepositStatus(order, financials) {
  const depositTarget = Number(financials?.deposit_amount || 0);
  const totalPaid = Number(financials?.total_paid || 0);
  const depositStatus = String(order?.deposit?.status || "").trim().toLowerCase();

  if (depositTarget <= 0) return "No deposit";
  if (depositStatus === "paid" || totalPaid >= depositTarget) return "Paid";
  if (depositStatus === "pending") return "Requested";
  if (totalPaid > 0) return "Partial";
  return "Outstanding";
}

function buildReleaseChecks(order, financials) {
  const approvalStatus = String(order?.approval_status || "").trim().toLowerCase();
  const depositTarget = Number(financials?.deposit_amount || 0);
  const totalPaid = Number(financials?.total_paid || 0);
  const depositStatus = String(order?.deposit?.status || "").trim().toLowerCase();
  const artworkCount = Array.isArray(order?.artwork_files) ? order.artwork_files.length : 0;
  const artworkWaiting = String(order?.quote_status || "").trim().toLowerCase() === "awaiting artwork approval";

  const checks = [
    {
      label: "Customer approval",
      passed: approvalStatus.includes("approved"),
      detail: order?.approval_status || "Not Sent",
    },
    {
      label: "Deposit",
      passed: depositTarget <= 0 || depositStatus === "paid" || totalPaid >= depositTarget,
      detail: buildDepositStatus(order, financials),
    },
    {
      label: "Artwork",
      passed: artworkCount === 0 || !artworkWaiting,
      detail: artworkCount ? "Artwork on file" : "No artwork blocker",
    },
  ];

  return {
    checks,
    blockers: checks.filter((check) => !check.passed).length,
  };
}

export default function QuoteDetail() {
  const { orderNumber } = useParams();
  const location = useLocation();
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
  const releaseChecks = useMemo(() => buildReleaseChecks(order, financials), [order, financials]);

  if (!order) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
        <h1>Quote not found</h1>
        <Link to="/admin/quotes">Back to Quotes</Link>
      </div>
    );
  }

  function handleAdvanceQuote() {
    if (!canAdvanceQuoteStatus(order.quote_status)) return;

    const nextQuoteStatus = getNextQuoteStatus(order.quote_status);
    updateStoredOrder(order.order_number, {
      quote_status: nextQuoteStatus,
      activity_type: "quote_status",
      activity_note: `Quote status changed to ${nextQuoteStatus}.`,
    });
  }

  function handleReleaseToProduction() {
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
            Quote Workflow
          </p>
          <h1 style={{ margin: "6px 0" }}>Quote {order.order_number}</h1>
          <p style={{ margin: 0, color: "#475569", maxWidth: "760px" }}>
            Sales-stage workspace for approvals, artwork confirmation, and deposit readiness before production release.
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
            Back to Quotes
          </Link>
          {canAdvanceQuoteStatus(order.quote_status) ? (
            <button
              type="button"
              onClick={handleAdvanceQuote}
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
              Mark {getNextQuoteStatus(order.quote_status)}
            </button>
          ) : null}
          {isQuoteReadyForProduction(order.quote_status) ? (
            <button
              type="button"
              onClick={handleReleaseToProduction}
              style={{
                border: "none",
                background: "#166534",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "11px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Release to Production
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gap: "18px" }}>
        <section style={cardStyle("#f8fafc")}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            <StatusPill tone={isQuoteReadyForProduction(order.quote_status) ? "success" : "default"}>
              {order.quote_status}
            </StatusPill>
            <StatusPill tone={depositStatus === "Paid" ? "success" : "warning"}>
              Deposit {depositStatus}
            </StatusPill>
            <StatusPill tone={String(order.approval_status || "").toLowerCase().includes("approved") ? "success" : "warning"}>
              Approval {order.approval_status || "Not Sent"}
            </StatusPill>
            <StatusPill tone={releaseChecks.blockers ? "warning" : "success"}>
              {releaseChecks.blockers ? `${releaseChecks.blockers} blocker${releaseChecks.blockers === 1 ? "" : "s"}` : "Release clear"}
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
            <DetailItem label="Deposit Status" value={depositStatus} />
            <DetailItem label="Approval" value={order.approval_status || "Not Sent"} />
            <DetailItem label="Source" value={order.source} />
            <DetailItem label="Due Date" value={order.due_date} />
            <DetailItem label="Artwork Required" value={order.artwork_files?.length ? "Attached" : "Pending"} />
          </div>
        </section>

        <section
          style={cardStyle(releaseChecks.blockers ? "#fff7ed" : "#ecfdf5")}
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
                  color: releaseChecks.blockers ? "#9a3412" : "#166534",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Release Rules
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  color: releaseChecks.blockers ? "#7c2d12" : "#166534",
                  lineHeight: 1.6,
                  fontWeight: 700,
                }}
              >
                A quote can move into production only after approval, deposit confirmation, and artwork sign-off where required.
              </p>
            </div>
            <StatusPill tone={releaseChecks.blockers ? "warning" : "success"}>
              {releaseChecks.blockers ? `${releaseChecks.blockers} blocker${releaseChecks.blockers === 1 ? "" : "s"}` : "Ready for release"}
            </StatusPill>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            {releaseChecks.checks.map((check) => (
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
                  {check.passed ? "Clear" : "Blocked"}
                </strong>
                <p style={{ margin: "4px 0 0", color: "#475569" }}>{check.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={cardStyle()}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <DetailItem label="Garment" value={order.garment} />
            <DetailItem label="Decoration Type" value={order.decoration_type} />
            <DetailItem label="Quantity" value={order.qty} />
            <DetailItem label="Placements" value={(order.placements || []).map((entry) => entry.placement).join(", ")} />
          </div>
          {order.notes ? (
            <div style={{ marginTop: "16px" }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: 800 }}>Notes</p>
              <p style={{ margin: "6px 0 0", color: "#171717" }}>{order.notes}</p>
            </div>
          ) : null}
        </section>

        <section style={cardStyle()}>
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
        </section>

      </div>
    </div>
  );
}
