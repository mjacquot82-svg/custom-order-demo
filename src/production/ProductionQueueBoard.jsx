import { Link } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import { buildQueuePriority, sortQueueByPriority } from "../queue/buildQueuePriority";
import { buildUnassignedQueueSection } from "../queue/buildUnassignedQueueSection";
import { buildWorkerQueueSections } from "../queue/buildWorkerQueueSections";

function PriorityBadge({ priority }) {
  if (!priority || priority.priorityLabel === "Normal") return null;

  const background = priority.overdue
    ? "#fef2f2"
    : priority.dueSoon
    ? "#fffbeb"
    : priority.unassigned
    ? "#fff7ed"
    : "#f1f5f9";

  const color = priority.overdue
    ? "#b91c1c"
    : priority.dueSoon
    ? "#b45309"
    : priority.unassigned
    ? "#c2410c"
    : "#475569";

  return (
    <span
      style={{
        background,
        color,
        borderRadius: "999px",
        padding: "5px 9px",
        fontSize: "12px",
        fontWeight: 900,
      }}
    >
      {priority.priorityLabel}
    </span>
  );
}

function OrderCard({ order }) {
  const priority = buildQueuePriority(order);

  return (
    <Link
      to={`/admin/orders/${order.order_number}`}
      style={{
        display: "grid",
        gap: "7px",
        textDecoration: "none",
        color: "#0f172a",
        background: priority.overdue ? "#fef2f2" : priority.dueSoon ? "#fffbeb" : "#f8fafc",
        border: priority.overdue ? "1px solid #fecaca" : priority.dueSoon ? "1px solid #fde68a" : "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
        <strong>{order.order_number}</strong>
        <PriorityBadge priority={priority} />
      </div>
      <span>{order.customer_name}</span>
      <span>{order.garment}</span>
      <span>{order.decoration_type}</span>
      <span>Due: {order.due_date || "—"}</span>
      <span>Assigned: {order.assigned_to_staff_name || "Unassigned"}</span>
      <div>
        <StatusBadge status={order.status} />
      </div>
    </Link>
  );
}

export default function ProductionQueueBoard({ orders = [] }) {
  const queueOrders = sortQueueByPriority(orders);
  const workerSections = buildWorkerQueueSections(queueOrders).map((section) => ({
    ...section,
    orders: sortQueueByPriority(section.orders),
  }));
  const unassignedSection = buildUnassignedQueueSection(queueOrders);

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      {unassignedSection.hasItems ? (
        <section
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "18px",
            padding: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "18px" }}>Unassigned</h2>
            <span style={{ color: "#92400e", fontWeight: 700 }}>{unassignedSection.count} jobs</span>
          </div>
          <div style={{ display: "grid", gap: "10px" }}>
            {unassignedSection.orders.map((order) => (
              <OrderCard key={order.order_number} order={order} />
            ))}
          </div>
        </section>
      ) : null}

      {workerSections.length ? (
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "18px" }}>{section.workerName}</h2>
                <span style={{ color: "#475569", fontWeight: 700 }}>{section.orderCount} jobs</span>
              </div>
              <div style={{ display: "grid", gap: "10px" }}>
                {section.orders.map((order) => (
                  <OrderCard key={order.order_number} order={order} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "18px",
            padding: "24px",
            color: "#64748b",
            textAlign: "center",
          }}
        >
          No orders match this queue view yet.
        </section>
      )}
    </div>
  );
}
