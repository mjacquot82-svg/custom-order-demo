import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { demoOrders } from "../data/demoOrders";
import { getStoredOrders, updateStoredOrder } from "../lib/ordersStore";
import { getStoredStaffUsers } from "../lib/staffUsersStore";
import StatusBadge from "../components/StatusBadge";

const openStatuses = ["awaiting artwork", "mockup sent", "awaiting approval", "approved", "awaiting deposit", "in production", "printing", "embroidery", "ready for pickup", "on hold"];

const cardStyle = { background: "#ffffff", borderRadius: "20px", padding: "22px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #e7e5e4" };
const selectStyle = { width: "100%", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "10px 11px", background: "#ffffff", color: "#0f172a", fontWeight: 700 };

function normalizeStatus(value) { return String(value || "").trim().toLowerCase(); }
function isOpenOrder(order) { const status = normalizeStatus(order.status); return openStatuses.includes(status) || Boolean(order.production_ready) || Boolean(order.needs_assignment); }
function normalizeOrder(order, index = 0) {
  return { ...order, customer_name: order.customer_name || ["ABC Construction", "City Hockey", "Local Customer"][index] || "Walk-in Customer", garment: order.garment || order.item || "Custom garment", status: order.status === "Submitted" || order.status === "Paid" ? "Approved" : order.status || "Awaiting Artwork", qty: Number(order.qty || 0), due_date: order.due_date || "", assigned_to_staff_id: order.assigned_to_staff_id || "", assigned_to_staff_name: order.assigned_to_staff_name || "" };
}
function formatWorkerName(worker) { return `${worker.name}${worker.role ? ` (${worker.role})` : ""}`; }

function JobCard({ order, staffUsers, onAssign }) {
  return (
    <article style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px", background: "#f8fafc", display: "grid", gap: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "start" }}>
        <div>
          <Link to={`/admin/orders/${order.order_number}`} style={{ color: "#0f172a", fontWeight: 900, textDecoration: "none" }}>{order.order_number}</Link>
          <p style={{ margin: "4px 0 0", color: "#334155", fontWeight: 700 }}>{order.customer_name}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div style={{ display: "grid", gap: "4px", color: "#64748b", fontSize: "14px" }}>
        <span><strong style={{ color: "#334155" }}>Item:</strong> {order.garment}</span>
        <span><strong style={{ color: "#334155" }}>Qty:</strong> {order.qty}</span>
        {order.created_by_staff_name && <span><strong style={{ color: "#334155" }}>Entered by:</strong> {order.created_by_staff_name}</span>}
        {order.due_date && <span style={{ color: "#92400e", fontWeight: 800 }}>Due: {order.due_date}</span>}
      </div>
      <label style={{ display: "grid", gap: "6px", color: "#334155", fontWeight: 800, fontSize: "13px" }}>
        Assigned Worker
        <select value={order.assigned_to_staff_id || ""} onChange={(event) => onAssign(order, event.target.value)} style={selectStyle}>
          <option value="">Unassigned</option>
          {staffUsers.map((worker) => <option key={worker.id} value={worker.id}>{formatWorkerName(worker)}</option>)}
        </select>
      </label>
    </article>
  );
}

export default function Assignments() {
  const [refreshKey, setRefreshKey] = useState(0);
  const staffUsers = useMemo(() => getStoredStaffUsers().filter((user) => user.status !== "Inactive"), [refreshKey]);
  const orders = useMemo(() => {
    const storedOrders = getStoredOrders().map(normalizeOrder);
    const demoQueueOrders = demoOrders.map(normalizeOrder);
    return (storedOrders.length ? storedOrders : demoQueueOrders).filter(isOpenOrder);
  }, [refreshKey]);
  const unassignedOrders = orders.filter((order) => !order.assigned_to_staff_id);
  const assignedOrders = orders.filter((order) => order.assigned_to_staff_id);
  const groupedByWorker = staffUsers.map((worker) => ({ worker, orders: assignedOrders.filter((order) => order.assigned_to_staff_id === worker.id) }));

  function handleAssign(order, staffId) {
    const selectedWorker = staffUsers.find((worker) => worker.id === staffId);
    updateStoredOrder(order.order_number, {
      assigned_to_staff_id: selectedWorker?.id || "",
      assigned_to_staff_name: selectedWorker?.name || "",
      assigned_to_staff_role: selectedWorker?.role || "",
      assigned_at: selectedWorker ? new Date().toISOString() : null,
      needs_assignment: !selectedWorker,
      activity_type: "assignment",
      activity_note: selectedWorker ? `Assigned to ${selectedWorker.name}.` : "Worker assignment removed.",
    });
    setRefreshKey((current) => current + 1);
  }

  return (
    <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "24px", fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "14px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div><p style={{ margin: 0, color: "#78716c", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Owner Scheduling</p><h1 style={{ margin: "6px 0 8px", fontSize: "32px" }}>Assign Production Jobs</h1><p style={{ margin: 0, color: "#64748b", maxWidth: "720px" }}>New orders land here until the owner assigns them to a worker.</p></div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}><Link to="/admin/staff-users" style={{ border: "1px solid #cbd5e1", background: "#ffffff", color: "#171717", borderRadius: "12px", padding: "12px 16px", textDecoration: "none", fontWeight: 800 }}>Manage Staff Users</Link><Link to="/admin/queue" style={{ border: "none", background: "#171717", color: "#ffffff", borderRadius: "12px", padding: "12px 16px", textDecoration: "none", fontWeight: 800 }}>Production Queue</Link></div>
      </div>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "18px" }}><div style={cardStyle}><p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>Open Jobs</p><h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{orders.length}</h2></div><div style={cardStyle}><p style={{ margin: 0, color: "#92400e", fontWeight: 800 }}>Need Assignment</p><h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{unassignedOrders.length}</h2></div><div style={cardStyle}><p style={{ margin: 0, color: "#047857", fontWeight: 800 }}>Assigned</p><h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{assignedOrders.length}</h2></div></section>
      <section style={{ ...cardStyle, marginBottom: "18px", background: unassignedOrders.length ? "#fffbeb" : "#ffffff", borderColor: unassignedOrders.length ? "#fde68a" : "#e7e5e4" }}><div style={{ marginBottom: "12px" }}><h2 style={{ margin: 0 }}>New Orders Needing Assignment</h2><p style={{ margin: "4px 0 0", color: "#92400e" }}>This is the owner notification area for newly entered production orders.</p></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>{unassignedOrders.length ? unassignedOrders.map((order) => <JobCard key={order.order_number} order={order} staffUsers={staffUsers} onAssign={handleAssign} />) : <p style={{ margin: 0, color: "#64748b" }}>All open jobs are currently assigned.</p>}</div></section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", alignItems: "start" }}>{groupedByWorker.map(({ worker, orders: workerOrders }) => <section key={worker.id} style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "12px" }}><div><h2 style={{ margin: 0, fontSize: "20px" }}>{worker.name}</h2><p style={{ margin: "3px 0 0", color: "#64748b", fontWeight: 700 }}>{worker.role}</p></div><span style={{ background: "#f1f5f9", color: "#334155", borderRadius: "999px", padding: "5px 10px", fontWeight: 900 }}>{workerOrders.length}</span></div><div style={{ display: "grid", gap: "10px" }}>{workerOrders.length ? workerOrders.map((order) => <JobCard key={order.order_number} order={order} staffUsers={staffUsers} onAssign={handleAssign} />) : <p style={{ margin: 0, color: "#94a3b8" }}>No jobs assigned to this worker.</p>}</div></section>)}</div>
    </div>
  );
}
