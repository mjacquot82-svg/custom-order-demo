import { useStoredOrders } from "../lib/ordersStore";
import { getStoredQuickSales } from "../lib/salesStore";
import DashboardAssignmentsPanel from "../dashboard/DashboardAssignmentsPanel";
import OperationsSummaryCards from "../dashboard/OperationsSummaryCards";
import { buildOperationalMetrics } from "../operations/buildOperationalMetrics";

function currency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

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
  const quickSales = getStoredQuickSales();
  const metrics = buildOperationalMetrics(orders);

  const todaysSalesTotal = quickSales.reduce((total, sale) => total + Number(sale.total || 0), 0);

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

      <DashboardAssignmentsPanel />

      <Section title="Revenue Snapshot">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          <div style={{ background: "#f8fafc", borderRadius: "18px", padding: "18px", border: "1px solid #e2e8f0" }}><p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>Quick Sales Revenue</p><h2 style={{ margin: "8px 0 0" }}>{currency(todaysSalesTotal)}</h2></div>
          <div style={{ background: "#f8fafc", borderRadius: "18px", padding: "18px", border: "1px solid #e2e8f0" }}><p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>Production Orders</p><h2 style={{ margin: "8px 0 0" }}>{orders.length}</h2></div>
        </div>
      </Section>

      <Section title="Production Types">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          {Object.entries(metrics.productionTypes).map(([type, total]) => (
            <article key={type} style={{ background: "#f8fafc", borderRadius: "18px", padding: "18px", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>{type}</p>
              <h2 style={{ margin: "8px 0 0" }}>{total}</h2>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Worker Load Summary">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          {Object.entries(metrics.workerLoad).map(([worker, total]) => (
            <article key={worker} style={{ background: "#f8fafc", borderRadius: "18px", padding: "18px", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>{worker}</p>
              <h2 style={{ margin: "8px 0 0" }}>{total} jobs</h2>
            </article>
          ))}
        </div>
      </Section>
    </div>
  );
}
