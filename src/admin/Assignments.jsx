import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  seedStoredOrders,
  updateStoredOrder,
  useStoredOrders,
} from "../lib/ordersStore";
import { getStoredStaffUsers } from "../lib/staffUsersStore";
import AssignmentDispatchBoard from "../assignments/AssignmentDispatchBoard";
import {
  isActiveOperationalStatus,
  isCompletedOperationalStatus,
  normalizeOperationalStatus,
  sortOrdersByOperationalStatus
} from "../orders/orderWorkflow";

const cardStyle = { background: "#ffffff", borderRadius: "20px", padding: "22px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #e7e5e4" };
function isOpenOrder(order) { return order.operational_visible !== false && isActiveOperationalStatus(order.status); }
function normalizeOrder(order, index = 0) { return { ...order, customer_name: order.customer_name || ["ABC Construction", "City Hockey", "Local Customer"][index] || "Walk-in Customer", garment: order.garment || order.item || "Custom garment", status: normalizeOperationalStatus(order.status || "New"), qty: Number(order.qty || 0), due_date: order.due_date || "", assigned_to_staff_id: order.assigned_to_staff_id || "", assigned_to_staff_name: order.assigned_to_staff_name || "", operational_visible: order.operational_visible !== false }; }
function isOverdue(order) { if (!order.due_date) return false; const due = new Date(`${order.due_date}T00:00:00`); const today = new Date(); today.setHours(0,0,0,0); return due < today && !isCompletedOperationalStatus(order.status); }
function formatWorkerName(worker) { return `${worker.name}${worker.role ? ` (${worker.role})` : ""}`; }

export default function Assignments() {
  const storedOrders = useStoredOrders();

  useEffect(() => {
    if (!storedOrders.length) {
      seedStoredOrders();
    }
  }, [storedOrders.length]);

  const staffUsers = useMemo(
    () => getStoredStaffUsers().filter((user) => user.status !== "Inactive"),
    []
  );
  const allOrders = useMemo(
    () => sortOrdersByOperationalStatus(storedOrders.map(normalizeOrder)),
    [storedOrders]
  );
  const activeOrders = useMemo(
    () => allOrders.filter(isOpenOrder),
    [allOrders]
  );
  const unassignedOrders = activeOrders.filter((order) => !order.assigned_to_staff_id);
  const assignedOrders = activeOrders.filter((order) => order.assigned_to_staff_id);
  const completedOrders = allOrders.filter((order) => isCompletedOperationalStatus(order.status));
  const overdueOrders = activeOrders.filter(isOverdue);

  function handleAssign(order, staffId) {
    const selectedWorker = staffUsers.find((worker) => worker.id === staffId);
    const previousAssignment = order.assigned_to_staff_name || "";
    const nextAssignment = selectedWorker?.name || "";
    const activityNote = !previousAssignment && nextAssignment
      ? `Assigned to ${nextAssignment}.`
      : previousAssignment && !nextAssignment
      ? `Unassigned from ${previousAssignment}.`
      : previousAssignment && nextAssignment && previousAssignment !== nextAssignment
      ? `Reassigned from ${previousAssignment} to ${nextAssignment}.`
      : selectedWorker
      ? `Assignment confirmed for ${nextAssignment}.`
      : "Assignment cleared.";

    updateStoredOrder(order.order_number, { assigned_to_staff_id: selectedWorker?.id || "", assigned_to_staff_name: selectedWorker?.name || "", assigned_to_staff_role: selectedWorker?.role || "", assigned_at: selectedWorker ? new Date().toISOString() : null, needs_assignment: !selectedWorker, activity_type: "assignment", activity_note: activityNote });
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "14px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div><p style={{ margin: 0, color: "#78716c", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Production Dispatch</p><h1 style={{ margin: "6px 0 8px", fontSize: "32px" }}>Assignment Dispatch Board</h1><p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>Assign new work, watch overdue jobs, and balance worker load from one dispatch board.</p></div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}><Link to="/admin/staff-users" style={{ border: "1px solid #cbd5e1", background: "#ffffff", color: "#171717", borderRadius: "12px", padding: "12px 16px", textDecoration: "none", fontWeight: 800 }}>Manage Staff</Link><Link to="/admin/orders" style={{ border: "none", background: "#171717", color: "#ffffff", borderRadius: "12px", padding: "12px 16px", textDecoration: "none", fontWeight: 800 }}>Production Orders</Link></div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px", marginBottom: "18px" }}>
        <div style={cardStyle}><p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>Open Jobs</p><h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{activeOrders.length}</h2></div>
        <div style={{ ...cardStyle, background: unassignedOrders.length ? "#fffbeb" : "#fff" }}><p style={{ margin: 0, color: "#92400e", fontWeight: 800 }}>Need Assignment</p><h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{unassignedOrders.length}</h2></div>
        <div style={{ ...cardStyle, background: overdueOrders.length ? "#fef2f2" : "#fff" }}><p style={{ margin: 0, color: "#b91c1c", fontWeight: 800 }}>Overdue</p><h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{overdueOrders.length}</h2></div>
        <div style={cardStyle}><p style={{ margin: 0, color: "#047857", fontWeight: 800 }}>Assigned</p><h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{assignedOrders.length}</h2></div>
        <div style={cardStyle}><p style={{ margin: 0, color: "#0f766e", fontWeight: 800 }}>Completed</p><h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{completedOrders.length}</h2></div>
      </section>

      <AssignmentDispatchBoard
        orders={allOrders}
        staffUsers={staffUsers}
        onAssign={handleAssign}
        formatWorkerName={formatWorkerName}
      />
    </div>
  );
}
