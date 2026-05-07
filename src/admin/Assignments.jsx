import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { demoOrders } from "../data/demoOrders";
import { getStoredOrders, updateStoredOrder } from "../lib/ordersStore";
import { getStoredStaffUsers } from "../lib/staffUsersStore";
import AssignmentDispatchBoard from "../assignments/AssignmentDispatchBoard";

const openStatuses = ["awaiting artwork", "mockup sent", "awaiting approval", "approved", "awaiting deposit", "in production", "printing", "ready for pickup", "on hold"];
const cardStyle = { background: "#ffffff", borderRadius: "20px", padding: "22px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #e7e5e4" };
const selectStyle = { width: "100%", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "10px 11px", background: "#ffffff", color: "#0f172a", fontWeight: 700 };
function normalizeStatus(value) { return String(value || "").trim().toLowerCase(); }
function isOpenOrder(order) { const status = normalizeStatus(order.status); return openStatuses.includes(status) || Boolean(order.production_ready) || Boolean(order.needs_assignment); }
function normalizeOrder(order, index = 0) { return { ...order, customer_name: order.customer_name || ["ABC Construction", "City Hockey", "Local Customer"][index] || "Walk-in Customer", garment: order.garment || order.item || "Custom garment", status: order.status === "Submitted" || order.status === "Paid" ? "Approved" : order.status || "Awaiting Artwork", qty: Number(order.qty || 0), due_date: order.due_date || "", assigned_to_staff_id: order.assigned_to_staff_id || "", assigned_to_staff_name: order.assigned_to_staff_name || "" }; }
function isOverdue(order) { if (!order.due_date) return false; const due = new Date(`${order.due_date}T00:00:00`); const today = new Date(); today.setHours(0,0,0,0); return due < today && normalizeStatus(order.status) !== "completed"; }
function formatWorkerName(worker) { return `${worker.name}${worker.role ? ` (${worker.role})` : ""}`; }

function UrgentAssignmentCard({ order, staffUsers, onAssign }) {
  return (
    <article style={{ border: isOverdue(order) ? "1px solid #fecaca" : "1px dashed #cbd5e1", borderRadius: "16px", padding: "14px", background: isOverdue(order) ? "#fef2f2" : "#f8fafc" }}>
      <strong>{order.order_number}</strong>
      <p style={{ margin: "5px 0", color: "#334155", fontWeight: 700 }}>{order.customer_name}</p>
      <p style={{ margin: "0 0 8px", color: "#64748b" }}>{order.garment} • Qty {order.qty}</p>
      {order.due_date && <p style={{ margin: "0 0 10px", color: isOverdue(order) ? "#b91c1c" : "#92400e", fontWeight: 900 }}>Due: {order.due_date}{isOverdue(order) ? " • OVERDUE" : ""}</p>}
      <select value={order.assigned_to_staff_id || ""} onChange={(event) => onAssign(order, event.target.value)} style={selectStyle}>
        <option value="">Assign worker…</option>
        {staffUsers.map((worker) => <option key={worker.id} value={worker.id}>{formatWorkerName(worker)}</option>)}
      </select>
    </article>
  );
}

export default function Assignments() {
  const [refreshKey, setRefreshKey] = useState(0);
  const staffUsers = useMemo(() => getStoredStaffUsers().filter((user) => user.status !== "Inactive"), [refreshKey]);
  const orders = useMemo(() => { const storedOrders = getStoredOrders().map(normalizeOrder); const demoQueueOrders = demoOrders.map(normalizeOrder); return (storedOrders.length ? storedOrders : demoQueueOrders).filter(isOpenOrder); }, [refreshKey]);
  const unassignedOrders = orders.filter((order) => !order.assigned_to_staff_id).sort((a, b) => String(a.due_date || "").localeCompare(String(b.due_date || "")));
  const assignedOrders = orders.filter((order) => order.assigned_to_staff_id);
  const overdueOrders = orders.filter(isOverdue);

  function handleAssign(order, staffId) {
    const selectedWorker = staffUsers.find((worker) => worker.id === staffId);
    updateStoredOrder(order.order_number, { assigned_to_staff_id: selectedWorker?.id || "", assigned_to_staff_name: selectedWorker?.name || "", assigned_to_staff_role: selectedWorker?.role || "", assigned_at: selectedWorker ? new Date().toISOString() : null, needs_assignment: !selectedWorker, activity_type: "assignment", activity_note: selectedWorker ? `Assigned to ${selectedWorker.name}.` : "Worker assignment removed." });
    setRefreshKey((current) => current + 1);
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "14px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div><p style={{ margin: 0, color: "#78716c", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Production Dispatch</p><h1 style={{ margin: "6px 0 8px", fontSize: "32px" }}>Assignment Dispatch Board</h1><p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>Assign new work, watch overdue jobs, and balance worker load from one dispatch board.</p></div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}><Link to="/admin/staff-users" style={{ border: "1px solid #cbd5e1", background: "#ffffff", color: "#171717", borderRadius: "12px", padding: "12px 16px", textDecoration: "none", fontWeight: 800 }}>Manage Staff</Link><Link to="/admin/queue" style={{ border: "none", background: "#171717", color: "#ffffff", borderRadius: "12px", padding: "12px 16px", textDecoration: "none", fontWeight: 800 }}>Production Queue</Link></div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px", marginBottom: "18px" }}>
        <div style={cardStyle}><p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>Open Jobs</p><h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{orders.length}</h2></div>
        <div style={{ ...cardStyle, background: unassignedOrders.length ? "#fffbeb" : "#fff" }}><p style={{ margin: 0, color: "#92400e", fontWeight: 800 }}>Need Assignment</p><h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{unassignedOrders.length}</h2></div>
        <div style={{ ...cardStyle, background: overdueOrders.length ? "#fef2f2" : "#fff" }}><p style={{ margin: 0, color: "#b91c1c", fontWeight: 800 }}>Overdue</p><h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{overdueOrders.length}</h2></div>
        <div style={cardStyle}><p style={{ margin: 0, color: "#047857", fontWeight: 800 }}>Assigned</p><h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{assignedOrders.length}</h2></div>
      </section>

      <section style={{ ...cardStyle, marginBottom: "18px", background: unassignedOrders.length ? "#fffbeb" : "#ffffff", borderColor: unassignedOrders.length ? "#fde68a" : "#e7e5e4" }}>
        <h2 style={{ marginTop: 0 }}>Unassigned Urgency Section</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>{unassignedOrders.length ? unassignedOrders.map((order) => <UrgentAssignmentCard key={order.order_number} order={order} staffUsers={staffUsers} onAssign={handleAssign} />) : <p style={{ margin: 0, color: "#64748b" }}>All open jobs are currently assigned.</p>}</div>
      </section>

      <AssignmentDispatchBoard orders={orders} />
    </div>
  );
}
