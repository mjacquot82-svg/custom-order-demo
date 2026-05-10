import { Link } from "react-router-dom";
import { normalizeProductionType } from "../constants/productionTypes";
import { useStoredOrders } from "../lib/ordersStore";
import { buildWorkerQueueSections } from "../queue/buildWorkerQueueSections";
import { buildUnassignedQueueSection } from "../queue/buildUnassignedQueueSection";
import { buildQueueWorkerSummary } from "../queue/buildQueueWorkerSummary";
import { buildQueuePriority, sortQueueByPriority } from "../queue/buildQueuePriority";
import StatusBadge from "../components/StatusBadge";
import {
  isCompletedOperationalStatus,
  normalizeOperationalStatus,
  sortOrdersByOperationalStatus,
} from "../orders/orderWorkflow";

function normalizeOrder(order) {
  return {
    ...order,
    customer_name: order.customer_name || "Walk-in Customer",
    garment: order.garment || order.item || "Custom garment",
    assigned_to_staff_name: order.assigned_to_staff_name || "Unassigned",
    decoration_type: normalizeProductionType(order.decoration_type),
    status: normalizeOperationalStatus(order.status),
  };
}

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

export default function Queue() {
  const orders = sortQueueByPriority(
    useStoredOrders()
      .map(normalizeOrder)
      .filter((order) => order.operational_visible !== false)
  );
  const activeOrders = orders.filter((order) => !isCompletedOperationalStatus(order.status));
  const completedOrders = sortOrdersByOperationalStatus(
    orders.filter((order) => isCompletedOperationalStatus(order.status))
  );
  const workerSections = buildWorkerQueueSections(activeOrders).map((section) => ({
    ...section,
    orders: sortQueueByPriority(section.orders),
  }));
  const unassignedSection = buildUnassignedQueueSection(activeOrders);
  const workerSummary = buildQueueWorkerSummary(workerSections);

  const overdueCount = orders.filter((order) => buildQueuePriority(order).overdue).length;
  const dueSoonCount = orders.filter((order) => buildQueuePriority(order).dueSoon).length;
  const completedCount = completedOrders.length;

  return (
    <div style={{ maxWidth: "1360px", margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Production Queue</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>Priority-sorted production queue with workflow status ordering, assignment visibility, and completed work separated from active operations.</p>
        </div>
        <Link to="/admin/assignments" style={{ background: "#171717", color: "#ffffff", textDecoration: "none", borderRadius: "12px", padding: "12px 16px", fontWeight: 700 }}>Open Assignments</Link>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "18px" }}>
        <div style={{ background: "#fef2f2", borderRadius: "16px", padding: "14px", border: "1px solid #fecaca" }}><strong style={{ color: "#b91c1c" }}>Overdue</strong><h2>{overdueCount}</h2></div>
        <div style={{ background: "#fffbeb", borderRadius: "16px", padding: "14px", border: "1px solid #fde68a" }}><strong style={{ color: "#b45309" }}>Due Soon</strong><h2>{dueSoonCount}</h2></div>
        <div style={{ background: "#f5f5f4", borderRadius: "16px", padding: "14px", border: "1px solid #d6d3d1" }}><strong style={{ color: "#57534e" }}>Completed</strong><h2>{completedCount}</h2></div>
      </section>

      <section style={{ background: "#ffffff", borderRadius: "18px", padding: "16px", marginBottom: "18px", border: "1px solid #e2e8f0" }}>
        <h2 style={{ marginTop: 0 }}>Worker Summary</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {workerSummary.map((worker) => (
            <div key={worker.workerName} style={{ border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px" }}>
              <strong>{worker.workerName}</strong>
              <p style={{ margin: "6px 0 0" }}>{worker.totalOrders} assigned orders</p>
            </div>
          ))}
        </div>
      </section>

      {unassignedSection.hasItems && (
        <section style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "18px", padding: "16px", marginBottom: "18px" }}>
          <h2 style={{ marginTop: 0 }}>Unassigned ({unassignedSection.count})</h2>
          <div style={{ display: "grid", gap: "10px" }}>{unassignedSection.orders.map((order) => <OrderCard key={order.order_number} order={order} />)}</div>
        </section>
      )}

      <div style={{ display: "grid", gap: "18px" }}>
        {workerSections.map((section) => (
          <section key={section.workerName} style={{ background: "#ffffff", borderRadius: "18px", padding: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ margin: 0 }}>{section.workerName}</h2>
              <span>{section.orderCount} orders</span>
            </div>
            <div style={{ display: "grid", gap: "10px" }}>{section.orders.map((order) => <OrderCard key={order.order_number} order={order} />)}</div>
          </section>
        ))}
      </div>

      {completedOrders.length > 0 && (
        <section style={{ background: "#fafaf9", borderRadius: "18px", padding: "16px", border: "1px solid #e7e5e4", marginTop: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
            <h2 style={{ margin: 0 }}>Completed Orders</h2>
            <span style={{ color: "#57534e", fontWeight: 700 }}>{completedOrders.length} closed jobs</span>
          </div>
          <div style={{ display: "grid", gap: "10px" }}>{completedOrders.map((order) => <OrderCard key={order.order_number} order={order} />)}</div>
        </section>
      )}
    </div>
  );
}
