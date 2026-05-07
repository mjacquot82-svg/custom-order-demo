import { Link } from "react-router-dom";
import { getStoredOrders } from "../lib/ordersStore";
import { buildWorkerQueueSections } from "../queue/buildWorkerQueueSections";
import { buildUnassignedQueueSection } from "../queue/buildUnassignedQueueSection";
import { buildQueueWorkerSummary } from "../queue/buildQueueWorkerSummary";

function normalizeOrder(order) {
  return {
    ...order,
    customer_name: order.customer_name || "Walk-in Customer",
    garment: order.garment || order.item || "Custom garment",
    assigned_to_staff_name:
      order.assigned_to_staff_name || "Unassigned",
    decoration_type:
      order.decoration_type || "Screen Printing",
  };
}

function OrderCard({ order }) {
  return (
    <Link
      to={`/admin/orders/${order.order_number}`}
      style={{
        display: "grid",
        gap: "7px",
        textDecoration: "none",
        color: "#0f172a",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "12px",
      }}
    >
      <strong>{order.order_number}</strong>
      <span>{order.customer_name}</span>
      <span>{order.garment}</span>
      <span>{order.decoration_type}</span>
      <span>
        Assigned: {order.assigned_to_staff_name || "Unassigned"}
      </span>
    </Link>
  );
}

export default function Queue() {
  const orders = getStoredOrders().map(normalizeOrder);

  const workerSections = buildWorkerQueueSections(orders);
  const unassignedSection = buildUnassignedQueueSection(orders);
  const workerSummary = buildQueueWorkerSummary(workerSections);

  return (
    <div style={{ maxWidth: "1360px", margin: "0 auto", padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Production Queue</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            Worker assignments and production visibility.
          </p>
        </div>

        <Link
          to="/admin/assignments"
          style={{
            background: "#171717",
            color: "#ffffff",
            textDecoration: "none",
            borderRadius: "12px",
            padding: "12px 16px",
            fontWeight: 700,
          }}
        >
          Open Assignments
        </Link>
      </div>

      <section
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          padding: "16px",
          marginBottom: "18px",
          border: "1px solid #e2e8f0",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Worker Summary</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          {workerSummary.map((worker) => (
            <div
              key={worker.workerName}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "14px",
              }}
            >
              <strong>{worker.workerName}</strong>
              <p style={{ margin: "6px 0 0" }}>
                {worker.totalOrders} assigned orders
              </p>
            </div>
          ))}
        </div>
      </section>

      {unassignedSection.hasItems && (
        <section
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "18px",
            padding: "16px",
            marginBottom: "18px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Needs Assignment ({unassignedSection.count})
          </h2>

          <div style={{ display: "grid", gap: "10px" }}>
            {unassignedSection.orders.map((order) => (
              <OrderCard key={order.order_number} order={order} />
            ))}
          </div>
        </section>
      )}

      <div style={{ display: "grid", gap: "18px" }}>
        {workerSections.map((section) => (
          <section
            key={section.workerName}
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "16px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h2 style={{ margin: 0 }}>{section.workerName}</h2>
              <span>{section.orderCount} orders</span>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              {section.orders.map((order) => (
                <OrderCard key={order.order_number} order={order} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
