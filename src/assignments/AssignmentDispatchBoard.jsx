import { buildAssignmentDispatchGroups } from "./buildAssignmentDispatchGroups";

export default function AssignmentDispatchBoard({ orders = [] }) {
  const groups = buildAssignmentDispatchGroups(orders);

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      {groups.map((group) => (
        <section
          key={group.workerName}
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "20px",
            padding: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>{group.workerName}</h2>
              <p style={{ margin: "4px 0 0", color: "#64748b" }}>
                {group.orderCount} assigned orders
              </p>
            </div>

            {group.overdueCount > 0 && (
              <div
                style={{
                  background: "#fef2f2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  borderRadius: "999px",
                  padding: "6px 10px",
                  fontWeight: 800,
                }}
              >
                {group.overdueCount} overdue
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            {group.orders.map((order) => (
              <article
                key={order.order_number}
                style={{
                  border: "1px dashed #cbd5e1",
                  borderRadius: "14px",
                  padding: "12px",
                  background: "#f8fafc",
                  cursor: "grab",
                }}
              >
                <strong>{order.order_number}</strong>

                <div style={{ marginTop: "6px", display: "grid", gap: "4px" }}>
                  <span>{order.customer_name || "Walk-in Customer"}</span>
                  <span>{order.garment || order.item || "Custom garment"}</span>
                  <span>Due: {order.due_date || "—"}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
