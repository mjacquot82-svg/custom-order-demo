import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  seedStoredOrders,
  updateStoredOrder,
  useStoredOrders,
} from "../lib/ordersStore";
import { getActiveStaffUser, getStoredStaffUsers } from "../lib/staffUsersStore";
import AssignmentDispatchBoard from "../assignments/AssignmentDispatchBoard";
import { buildWorkerJobsView } from "../worker/buildWorkerJobsView";
import {
  isActiveOperationalStatus,
  isCompletedOperationalStatus,
  normalizeOperationalStatus,
  sortOrdersByOperationalStatus,
} from "../orders/orderWorkflow";
import {
  getAssignedOrdersForStaff,
  isStaffWorkspaceView,
} from "./adminRoleView";

const cardStyle = {
  background: "#ffffff",
  borderRadius: "20px",
  padding: "22px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #e7e5e4",
};

function isOpenOrder(order) {
  return order.operational_visible !== false && isActiveOperationalStatus(order.status);
}

function normalizeOrder(order, index = 0) {
  return {
    ...order,
    customer_name: order.customer_name || ["ABC Construction", "City Hockey", "Local Customer"][index] || "Walk-in Customer",
    garment: order.garment || order.item || "Custom garment",
    status: normalizeOperationalStatus(order.status || "New"),
    qty: Number(order.qty || 0),
    due_date: order.due_date || "",
    assigned_to_staff_id: order.assigned_to_staff_id || "",
    assigned_to_staff_name: order.assigned_to_staff_name || "",
    operational_visible: order.operational_visible !== false,
  };
}

function isOverdue(order) {
  if (!order.due_date) return false;
  const due = new Date(`${order.due_date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today && !isCompletedOperationalStatus(order.status);
}

function formatWorkerName(worker) {
  return `${worker.name}${worker.role ? ` (${worker.role})` : ""}`;
}

function SummaryMetric({ label, value, tone = "default" }) {
  const palette =
    tone === "warning"
      ? { background: "#fffbeb", color: "#92400e" }
      : tone === "danger"
        ? { background: "#fef2f2", color: "#b91c1c" }
        : tone === "success"
          ? { background: "#ecfdf5", color: "#047857" }
          : { background: "#ffffff", color: "#64748b" };

  return (
    <div style={{ ...cardStyle, background: palette.background }}>
      <p style={{ margin: 0, color: palette.color, fontWeight: 800 }}>{label}</p>
      <h2 style={{ margin: "8px 0 0", fontSize: "34px" }}>{value}</h2>
    </div>
  );
}

function StaffQueueNote() {
  return (
    <section
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "18px",
        padding: "16px 18px",
        display: "grid",
        gap: "6px",
      }}
    >
      <strong style={{ color: "#0f172a" }}>Personal execution queue</strong>
      <p style={{ margin: 0, color: "#64748b" }}>
        This workspace only tracks jobs assigned directly to you. Use Shop Production when you
        need full-floor visibility or unassigned work.
      </p>
    </section>
  );
}

function StaffAssignmentColumn({ title, description, orders = [], emptyMessage }) {
  return (
    <section style={{ ...cardStyle, display: "grid", gap: "14px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px" }}>{title}</h2>
        <p style={{ margin: 0, color: "#64748b" }}>{description}</p>
      </div>

      {orders.length ? (
        <div style={{ display: "grid", gap: "10px" }}>
          {orders.map((order) => (
            <Link
              key={order.order_number}
              to={`/admin/orders/${order.order_number}`}
              style={{
                display: "grid",
                gap: "6px",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                padding: "14px",
                textDecoration: "none",
                color: "#171717",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <strong>{order.order_number}</strong>
                <span style={{ color: "#475569", fontWeight: 700, fontSize: "13px" }}>{order.status}</span>
              </div>
              <span style={{ fontWeight: 700 }}>{order.customer_name}</span>
              <span style={{ color: "#64748b", fontSize: "14px" }}>
                {order.garment} • Due {order.due_date || "TBD"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, color: "#64748b", fontWeight: 700 }}>{emptyMessage}</p>
      )}
    </section>
  );
}

function OwnerAssignments({ allOrders, staffUsers, activeOrders, assignedOrders, completedOrders, overdueOrders }) {
  const unassignedOrders = activeOrders.filter((order) => !order.assigned_to_staff_id);

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

    updateStoredOrder(order.order_number, {
      assigned_to_staff_id: selectedWorker?.id || "",
      assigned_to_staff_name: selectedWorker?.name || "",
      assigned_to_staff_role: selectedWorker?.role || "",
      assigned_at: selectedWorker ? new Date().toISOString() : null,
      needs_assignment: !selectedWorker,
      activity_type: "assignment",
      activity_note: activityNote,
    });
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "14px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div><p style={{ margin: 0, color: "#78716c", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Production Dispatch</p><h1 style={{ margin: "6px 0 8px", fontSize: "32px" }}>Assignment Dispatch Board</h1><p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>Assign new work, watch overdue jobs, and balance worker load from one dispatch board.</p></div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px", marginBottom: "18px" }}>
        <SummaryMetric label="Open Jobs" value={activeOrders.length} />
        <SummaryMetric label="Need Assignment" value={unassignedOrders.length} tone="warning" />
        <SummaryMetric label="Overdue" value={overdueOrders.length} tone="danger" />
        <SummaryMetric label="Assigned" value={assignedOrders.length} tone="success" />
        <SummaryMetric label="Completed" value={completedOrders.length} />
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

function StaffAssignments({ allOrders, staffUser }) {
  const assignedOrders = getAssignedOrdersForStaff(allOrders, staffUser);
  const activeAssignedOrders = assignedOrders.filter((order) => isOpenOrder(order));
  const overdueOrders = activeAssignedOrders.filter(isOverdue);
  const groupedOrders = buildWorkerJobsView(activeAssignedOrders, staffUser);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px", display: "grid", gap: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "14px", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, color: "#78716c", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>My Assigned Work</p>
          <h1 style={{ margin: "6px 0 8px", fontSize: "32px" }}>My Assigned Work</h1>
          <p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>
            This is your personal execution workspace. Focus on jobs assigned directly to you and
            update production actions without the noise of full-shop dashboards.
          </p>
        </div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px" }}>
        <SummaryMetric label="Assigned To Me" value={activeAssignedOrders.length} />
        <SummaryMetric label="Ready To Start" value={groupedOrders.ready.length} />
        <SummaryMetric label="In Production" value={groupedOrders.inProgress.length} tone="success" />
        <SummaryMetric label="Overdue" value={overdueOrders.length} tone="danger" />
      </section>

      <StaffQueueNote />

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        <StaffAssignmentColumn
          title="Ready To Start"
          description="Assigned jobs waiting for production work."
          orders={groupedOrders.ready}
          emptyMessage="No jobs assigned to you are waiting to be started."
        />
        <StaffAssignmentColumn
          title="In Production"
          description="Work already moving through production."
          orders={groupedOrders.inProgress}
          emptyMessage="No jobs assigned to you are currently marked in production."
        />
        <StaffAssignmentColumn
          title="Ready For Pickup"
          description="Completed production work waiting for handoff."
          orders={groupedOrders.paused}
          emptyMessage="No jobs assigned to you are waiting for pickup."
        />
      </section>
    </div>
  );
}

export default function Assignments() {
  const storedOrders = useStoredOrders();
  const staffUser = getActiveStaffUser();

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
  const activeOrders = useMemo(() => allOrders.filter(isOpenOrder), [allOrders]);
  const assignedOrders = activeOrders.filter((order) => order.assigned_to_staff_id);
  const completedOrders = allOrders.filter((order) => isCompletedOperationalStatus(order.status));
  const overdueOrders = activeOrders.filter(isOverdue);

  if (isStaffWorkspaceView(staffUser)) {
    return <StaffAssignments allOrders={allOrders} staffUser={staffUser} />;
  }

  return (
    <OwnerAssignments
      allOrders={allOrders}
      staffUsers={staffUsers}
      activeOrders={activeOrders}
      assignedOrders={assignedOrders}
      completedOrders={completedOrders}
      overdueOrders={overdueOrders}
    />
  );
}
