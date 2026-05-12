import { Link } from "react-router-dom";
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

function buildQuoteSummary(order) {
  const financials = normalizeOrderFinancials(order, {
    additionalSources: order.quote ? [{ label: "storedQuote", value: order.quote }] : [],
  });

  return {
    total: financials.total_amount,
    deposit: financials.deposit_amount,
    balance: financials.balance_due,
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

export default function Quotes() {
  const orders = useStoredOrders();
  const quotes = sortQuotesByStatus(
    orders.filter((order) => order.operational_visible !== true)
  );
  const statusCounts = buildStatusCountMap(quotes);
  const readyQuotes = quotes.filter((quote) => isQuoteReadyForProduction(quote.quote_status));

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
        <div style={{ display: "grid", gap: "14px" }}>
          {quotes.length ? (
            quotes.map((quote) => {
              const summary = buildQuoteSummary(quote);

              return (
                <article
                  key={quote.order_number}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "18px",
                    padding: "18px",
                    display: "grid",
                    gap: "14px",
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
                    <div>
                      <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>
                        {quote.order_number}
                      </p>
                      <h2 style={{ margin: "6px 0 4px", fontSize: "22px" }}>
                        {quote.customer_name || "Walk-in Customer"}
                      </h2>
                      <p style={{ margin: 0, color: "#475569" }}>
                        {quote.garment || "Custom garment"} • Qty {quote.qty || 0}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: "999px",
                        padding: "8px 12px",
                        background: isQuoteReadyForProduction(quote.quote_status) ? "#ecfdf5" : "#f8fafc",
                        color: isQuoteReadyForProduction(quote.quote_status) ? "#166534" : "#0f172a",
                        border: isQuoteReadyForProduction(quote.quote_status)
                          ? "1px solid #bbf7d0"
                          : "1px solid #e2e8f0",
                        fontWeight: 800,
                      }}
                    >
                      {quote.quote_status}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: 800 }}>Quote Total</p>
                      <strong>{money(summary.total)}</strong>
                    </div>
                    <div>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: 800 }}>Deposit Target</p>
                      <strong>{money(summary.deposit)}</strong>
                    </div>
                    <div>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: 800 }}>Balance</p>
                      <strong>{money(summary.balance)}</strong>
                    </div>
                    <div>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: 800 }}>Next Step</p>
                      <strong>
                        {canAdvanceQuoteStatus(quote.quote_status)
                          ? getNextQuoteStatus(quote.quote_status)
                          : "Release to Production"}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <Link
                      to={`/admin/quotes/${quote.order_number}`}
                      style={{
                        background: "#171717",
                        color: "#ffffff",
                        borderRadius: "12px",
                        padding: "11px 14px",
                        textDecoration: "none",
                        fontWeight: 700,
                      }}
                    >
                      Open Quote
                    </Link>
                    {isQuoteReadyForProduction(quote.quote_status) ? (
                      <span style={{ color: "#166534", fontWeight: 800, alignSelf: "center" }}>
                        Ready to release into Production Orders
                      </span>
                    ) : null}
                  </div>
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
