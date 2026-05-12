import { useStoredOrders } from "../lib/ordersStore";
import OperationsSummaryCards from "../dashboard/OperationsSummaryCards";
import { buildOperationalMetrics } from "../operations/buildOperationalMetrics";

function Section({ title, children }) {
  return (
    <section style={{ background: "#ffffff", borderRadius: "20px", padding: "22px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "22px" }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const orders = useStoredOrders();
  const metrics = buildOperationalMetrics(orders);
  const operationsSnapshotCards = [
    { label: "Active Quotes", value: metrics.activeQuotes, tone: "default" },
    { label: "Awaiting Deposit", value: metrics.awaitingDeposit, tone: "warning" },
    { label: "Active Production Jobs", value: metrics.activeProduction, tone: "success" },
    { label: "Unassigned Jobs", value: metrics.needsAssignment, tone: "warning" },
    { label: "Outstanding Payments", value: metrics.outstandingPayments, tone: "default" },
  ];
  const productionTypes = Object.entries(metrics.productionTypes).filter(([, total]) => total > 0);
  const workerLoad = Object.entries(metrics.workerLoad).sort((left, right) => right[1] - left[1]);

  const toneStyles = {
    default: { background: "#f8fafc", border: "#e2e8f0", value: "#0f172a", label: "#475569" },
    warning: { background: "#fff7ed", border: "#fed7aa", value: "#9a3412", label: "#9a3412" },
    success: { background: "#ecfdf5", border: "#bbf7d0", value: "#166534", label: "#166534" },
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <p style={{ margin: 0, color: "#78716c", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Owner Operations</p>
        <h1 style={{ margin: "6px 0 8px", fontSize: "36px" }}>Operations Dashboard</h1>
        <p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>Monitor production, dispatch assignments, identify overdue work, and manage daily shop operations from one command center.</p>
      </div>

      <div style={{ marginBottom: "22px" }}>
        <OperationsSummaryCards metrics={metrics} />
      </div>

      <Section title="Operations Snapshot">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {operationsSnapshotCards.map((card) => {
            const palette = toneStyles[card.tone] || toneStyles.default;

            return (
              <article
                key={card.label}
                style={{
                  background: palette.background,
                  borderRadius: "16px",
                  padding: "16px",
                  border: `1px solid ${palette.border}`,
                }}
              >
                <p style={{ margin: 0, color: palette.label, fontSize: "12px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {card.label}
                </p>
                <h2 style={{ margin: "10px 0 0", color: palette.value, fontSize: "30px" }}>{card.value}</h2>
              </article>
            );
          })}
        </div>
      </Section>

      <Section title="Production Types">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {productionTypes.map(([type, total]) => (
            <article key={type} style={{ background: "#f8fafc", borderRadius: "18px", padding: "18px", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>{type}</p>
              <h2 style={{ margin: "8px 0 0" }}>{total}</h2>
            </article>
          ))}
          {!productionTypes.length ? (
            <article style={{ background: "#f8fafc", borderRadius: "18px", padding: "18px", border: "1px solid #e2e8f0", color: "#64748b", fontWeight: 700 }}>
              No active production mix yet.
            </article>
          ) : null}
        </div>
      </Section>

      <Section title="Worker Load Summary">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {workerLoad.map(([worker, total]) => (
            <article key={worker} style={{ background: "#f8fafc", borderRadius: "18px", padding: "18px", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>{worker}</p>
              <h2 style={{ margin: "8px 0 0" }}>{total} jobs</h2>
            </article>
          ))}
          {!workerLoad.length ? (
            <article style={{ background: "#f8fafc", borderRadius: "18px", padding: "18px", border: "1px solid #e2e8f0", color: "#64748b", fontWeight: 700 }}>
              No jobs are currently assigned.
            </article>
          ) : null}
        </div>
      </Section>
    </div>
  );
}
