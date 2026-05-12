import { useStoredOrders } from "../lib/ordersStore";
import { normalizeOrderFinancials } from "../orders/orderFinancials";

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
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

export default function InvoicesPayments() {
  const orders = useStoredOrders();
  const financialOrders = orders.map((order) => normalizeOrderFinancials(order));
  const totalOutstanding = financialOrders.reduce(
    (total, order) => total + Number(order.balance_due || 0),
    0
  );
  const totalDeposits = financialOrders.reduce(
    (total, order) => total + Number(order.deposit_amount || 0),
    0
  );
  const totalPaid = financialOrders.reduce(
    (total, order) => total + Number(order.amount_paid || 0),
    0
  );
  const accountsReceivable = financialOrders.filter((order) => Number(order.balance_due || 0) > 0);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
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
          Financial Workflow
        </p>
        <h1 style={{ margin: "8px 0 6px" }}>Invoices & Payments</h1>
        <p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>
          Placeholder financial workspace for deposits, balances owing, payments, and future AR handling without mixing that work into production pages.
        </p>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <SummaryCard label="Total Deposits" value={money(totalDeposits)} />
        <SummaryCard label="Payments Recorded" value={money(totalPaid)} tone="success" />
        <SummaryCard label="Balances Owing" value={money(totalOutstanding)} tone="warning" />
        <SummaryCard label="AR Jobs" value={accountsReceivable.length} />
      </section>

      <section
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "22px",
          border: "1px solid #e8edf3",
          display: "grid",
          gap: "16px",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 6px" }}>Planned Modules</h2>
          <p style={{ margin: 0, color: "#64748b" }}>
            This area is intentionally lightweight for now. The purpose is to reserve clean financial architecture before invoices, receipt history, and AR workflows expand.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <SummaryCard label="Invoices" value="Placeholder" />
          <SummaryCard label="Deposits" value="Placeholder" />
          <SummaryCard label="Payment Log" value="Placeholder" />
          <SummaryCard label="AR Follow-up" value="Placeholder" />
        </div>
      </section>
    </div>
  );
}
