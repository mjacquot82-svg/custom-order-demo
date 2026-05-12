import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { getOrderArtworkNames } from "../lib/orderArtwork";
import { useStoredOrders } from "../lib/ordersStore";
import { normalizeOrderFinancials } from "../orders/orderFinancials";
import {
  canAdvanceQuoteStatus,
  getNextQuoteStatus,
  isQuoteReadyForProduction,
  sortQuotesByStatus,
} from "../quotes/quoteWorkflow";

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

function buildDepositStatus(order, financials) {
  const depositTarget = Number(financials.deposit_amount || 0);
  const totalPaid = Number(financials.total_paid || 0);
  const depositStatus = String(order.deposit?.status || "").trim().toLowerCase();

  if (depositTarget <= 0) return "No deposit";
  if (depositStatus === "paid" || totalPaid >= depositTarget) return "Paid";
  if (depositStatus === "pending") return "Requested";
  if (totalPaid > 0) return "Partial";
  return "Outstanding";
}

function buildApprovalStatus(order) {
  return formatValue(order.approval_status, "Not Sent");
}

function isApprovalSatisfied(order) {
  const approvalStatus = String(order.approval_status || "").trim().toLowerCase();

  return approvalStatus.includes("approved");
}

function isDepositSatisfied(order, financials) {
  const depositTarget = Number(financials.deposit_amount || 0);
  const totalPaid = Number(financials.total_paid || 0);
  const depositStatus = String(order.deposit?.status || "").trim().toLowerCase();

  return depositTarget <= 0 || depositStatus === "paid" || totalPaid >= depositTarget;
}

function isArtworkSatisfied(order) {
  const artworkCount = Array.isArray(order.artwork_files) ? order.artwork_files.length : 0;
  return artworkCount === 0 || String(order.quote_status || "").trim().toLowerCase() !== "awaiting artwork approval";
}

function buildReleaseChecks(order, financials) {
  const checks = [
    {
      label: "Customer approval",
      passed: isApprovalSatisfied(order),
      detail: buildApprovalStatus(order),
    },
    {
      label: "Deposit",
      passed: isDepositSatisfied(order, financials),
      detail: buildDepositStatus(order, financials),
    },
    {
      label: "Artwork",
      passed: isArtworkSatisfied(order),
      detail:
        Array.isArray(order.artwork_files) && order.artwork_files.length
          ? "Artwork on file"
          : "No artwork blocker",
    },
  ];

  return {
    checks,
    blockers: checks.filter((check) => !check.passed).length,
  };
}

function buildQuoteSummary(order) {
  const financials = normalizeOrderFinancials(order, {
    additionalSources: order.quote ? [{ label: "storedQuote", value: order.quote }] : [],
  });
  const placements = Array.isArray(order.placements) ? order.placements : [];
  const artworkNames = getOrderArtworkNames(order);
  const release = buildReleaseChecks(order, financials);

  return {
    financials,
    total: financials.total_amount,
    depositTarget: financials.deposit_amount,
    balance: financials.balance_due,
    depositStatus: buildDepositStatus(order, financials),
    approvalStatus: buildApprovalStatus(order),
    dueDate: formatValue(order.due_date),
    artworkNames,
    placementSummary: formatList(placements.map((entry) => entry.placement)),
    decorationSummary: formatList(
      placements.map((entry) => entry.decoration_type || order.decoration_type),
      formatValue(order.decoration_type)
    ),
    release,
  };
}

function buildStatusCountMap(quotes) {
  return quotes.reduce((counts, quote) => {
    const key = quote.quote_status || "Draft";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function SummaryCard({ label, value, tone = "default" }) {
  const tones = {
    default: { background: "#ffffff", border: "#e2e8f0", color: "#0f172a" },
    warning: { background: "#fff7ed", border: "#fed7aa", color: "#9a3412" },
    success: { background: "#ecfdf5", border: "#bbf7d0", color: "#166534" },
  };
  const palette = tones[tone] || tones.default;

  return (
    <article
      style={{
        background: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: "18px",
        padding: "18px",
      }}
    >
      <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>{label}</p>
      <h2 style={{ margin: "8px 0 0", color: palette.color }}>{value}</h2>
    </article>
  );
}

function Field({ label, value, tone = "default" }) {
  const tones = {
    default: { label: "#64748b", value: "#0f172a" },
    warning: { label: "#9a3412", value: "#7c2d12" },
    success: { label: "#166534", value: "#166534" },
  };
  const palette = tones[tone] || tones.default;

  return (
    <div style={{ minWidth: 0 }}>
      <p
        style={{
          margin: 0,
          color: palette.label,
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <strong
        style={{
          display: "block",
          marginTop: "6px",
          color: palette.value,
          fontSize: "14px",
          lineHeight: 1.4,
        }}
      >
        {value}
      </strong>
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
        gap: "6px",
        borderRadius: "999px",
        padding: "7px 11px",
        background: palette.background,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        fontWeight: 800,
        fontSize: "12px",
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

function ExpandIcon({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 160ms ease",
      }}
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Quotes() {
  const orders = useStoredOrders();
  const [expandedQuotes, setExpandedQuotes] = useState({});
  const quotes = useMemo(
    () =>
      sortQuotesByStatus(orders.filter((order) => order.operational_visible !== true)),
    [orders]
  );
  const statusCounts = useMemo(() => buildStatusCountMap(quotes), [quotes]);
  const readyQuotes = useMemo(
    () => quotes.filter((quote) => isQuoteReadyForProduction(quote.quote_status)),
    [quotes]
  );

  function toggleQuote(orderNumber) {
    setExpandedQuotes((current) => ({
      ...current,
      [orderNumber]: !current[orderNumber],
    }));
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
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
            Sales Workflow
          </p>
          <h1 style={{ margin: "8px 0 6px" }}>Quotes</h1>
          <p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>
            Intake, approvals, artwork sign-off, and deposit readiness stay here until work is released into production.
          </p>
        </div>

        <Link
          to="/admin/quotes/new"
          style={{
            background: "#171717",
            color: "#ffffff",
            borderRadius: "12px",
            padding: "12px 16px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          New Quote
        </Link>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <SummaryCard label="Open Quotes" value={quotes.length} />
        <SummaryCard label="Awaiting Approval" value={statusCounts["Awaiting Approval"] || 0} tone="warning" />
        <SummaryCard label="Awaiting Deposit" value={statusCounts["Awaiting Deposit"] || 0} tone="warning" />
        <SummaryCard label="Ready For Production" value={readyQuotes.length} tone="success" />
      </section>

      <section
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "22px",
          border: "1px solid #e8edf3",
        }}
      >
        <div style={{ display: "grid", gap: "12px" }}>
          {quotes.length ? (
            quotes.map((quote) => {
              const summary = buildQuoteSummary(quote);
              const isExpanded = Boolean(expandedQuotes[quote.order_number]);
              const blockerTone = summary.release.blockers ? "warning" : "success";

              return (
                <article
                  key={quote.order_number}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "18px",
                    padding: "16px 18px",
                    display: "grid",
                    gap: "14px",
                    background: isExpanded ? "#fcfdff" : "#ffffff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <StatusPill tone={isQuoteReadyForProduction(quote.quote_status) ? "success" : "default"}>
                        {formatValue(quote.quote_status, "Draft")}
                      </StatusPill>
                      <StatusPill tone={summary.depositStatus === "Paid" ? "success" : "warning"}>
                        Deposit {summary.depositStatus}
                      </StatusPill>
                      <StatusPill tone={blockerTone}>
                        {summary.release.blockers ? `${summary.release.blockers} blocker${summary.release.blockers === 1 ? "" : "s"}` : "Release clear"}
                      </StatusPill>
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                      <Link
                        to={`/admin/quotes/${quote.order_number}`}
                        style={{
                          color: "#0f172a",
                          textDecoration: "none",
                          fontWeight: 700,
                          padding: "9px 12px",
                          borderRadius: "10px",
                          border: "1px solid #d6dbe4",
                          background: "#ffffff",
                        }}
                      >
                        Open Quote
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleQuote(quote.order_number)}
                        aria-expanded={isExpanded}
                        aria-controls={`quote-details-${quote.order_number}`}
                        style={{
                          border: "1px solid #d6dbe4",
                          background: "#ffffff",
                          color: "#0f172a",
                          borderRadius: "10px",
                          padding: "9px 12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {isExpanded ? "Collapse" : "Expand"}
                        <ExpandIcon open={isExpanded} />
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: "14px",
                    }}
                  >
                    <Field label="Quote #" value={quote.order_number} />
                    <Field label="Customer" value={formatValue(quote.customer_name, "Walk-in Customer")} />
                    <Field label="Status" value={formatValue(quote.quote_status, "Draft")} />
                    <Field
                      label="Deposit Status"
                      value={summary.depositStatus}
                      tone={summary.depositStatus === "Paid" ? "success" : "warning"}
                    />
                    <Field label="Due Date" value={summary.dueDate} />
                    <Field label="Total" value={money(summary.total)} />
                    <Field
                      label="Approval"
                      value={summary.approvalStatus}
                      tone={summary.approvalStatus.toLowerCase().includes("approved") ? "success" : "warning"}
                    />
                  </div>

                  {isExpanded ? (
                    <div
                      id={`quote-details-${quote.order_number}`}
                      style={{
                        borderTop: "1px solid #e2e8f0",
                        paddingTop: "14px",
                        display: "grid",
                        gap: "14px",
                      }}
                    >
                      <section
                        style={{
                          borderRadius: "16px",
                          border: `1px solid ${summary.release.blockers ? "#fed7aa" : "#bbf7d0"}`,
                          background: summary.release.blockers ? "#fff7ed" : "#ecfdf5",
                          padding: "14px 16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "center",
                            flexWrap: "wrap",
                            marginBottom: "10px",
                          }}
                        >
                          <div>
                            <p
                              style={{
                                margin: 0,
                                color: summary.release.blockers ? "#9a3412" : "#166534",
                                fontSize: "11px",
                                fontWeight: 800,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                              }}
                            >
                              Release Rules
                            </p>
                            <p
                              style={{
                                margin: "4px 0 0",
                                color: summary.release.blockers ? "#7c2d12" : "#166534",
                                fontWeight: 700,
                              }}
                            >
                              {summary.release.blockers
                                ? "Production release is blocked until all required checkpoints are clear."
                                : "Operational blockers are clear for production release."}
                            </p>
                          </div>
                          <StatusPill tone={blockerTone}>
                            {summary.release.blockers
                              ? `${summary.release.blockers} blocker${summary.release.blockers === 1 ? "" : "s"}`
                              : "Ready for release"}
                          </StatusPill>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "10px",
                          }}
                        >
                          {summary.release.checks.map((check) => (
                            <div
                              key={check.label}
                              style={{
                                borderRadius: "12px",
                                padding: "12px",
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
                              <p style={{ margin: "4px 0 0", color: "#475569", fontSize: "13px" }}>{check.detail}</p>
                            </div>
                          ))}
                        </div>
                      </section>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px" }}>
                          <Field label="Garment" value={formatValue(quote.garment, "Custom garment")} />
                          <div style={{ marginTop: "12px" }}>
                            <Field label="Decoration" value={summary.decorationSummary} />
                          </div>
                          <div style={{ marginTop: "12px" }}>
                            <Field label="Quantity" value={formatValue(quote.qty, "0")} />
                          </div>
                        </div>

                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px" }}>
                          <Field label="Placements" value={summary.placementSummary} />
                          <div style={{ marginTop: "12px" }}>
                            <Field label="Artwork" value={formatList(summary.artworkNames)} />
                          </div>
                        </div>

                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px" }}>
                          <Field label="Pricing" value={`Deposit ${money(summary.depositTarget)} • Balance ${money(summary.balance)}`} />
                          <div style={{ marginTop: "12px" }}>
                            <Field label="Payment State" value={formatValue(summary.financials.payment_status, "Unpaid")} />
                          </div>
                        </div>

                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px" }}>
                          <Field
                            label="Production Info"
                            value={
                              canAdvanceQuoteStatus(quote.quote_status)
                                ? `Next: ${getNextQuoteStatus(quote.quote_status)}`
                                : "Next: Release to Production"
                            }
                          />
                          <div style={{ marginTop: "12px" }}>
                            <Field label="Source" value={formatValue(quote.source)} />
                          </div>
                        </div>
                      </div>

                      {quote.notes ? (
                        <div
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "14px",
                            padding: "14px",
                            background: "#ffffff",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              color: "#64748b",
                              fontSize: "11px",
                              fontWeight: 800,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                            }}
                          >
                            Notes
                          </p>
                          <p style={{ margin: "8px 0 0", color: "#0f172a", lineHeight: 1.6 }}>{quote.notes}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div
              style={{
                border: "1px dashed #cbd5e1",
                borderRadius: "18px",
                padding: "28px",
                color: "#64748b",
              }}
            >
              No active quotes yet. New intake created from this area will stay in sales workflow until released for production.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
