import {
  canAdvanceOperationalStatus,
  getNextOperationalStatus,
} from "../orders/orderWorkflow";

function formatAssignedAt(value) {
  if (!value) return "Not assigned yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export default function AssignmentPanel({
  order,
  staffUsers = [],
  onAssign,
  onAdvanceStatus,
}) {
  const canAdvance = canAdvanceOperationalStatus(order.status);
  const nextStatus = canAdvance ? getNextOperationalStatus(order.status) : null;
  const assignedWorker = order.assigned_to_staff_name || "Unassigned";

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "20px",
        padding: "20px",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Assignment & Workflow</h2>

      <div style={{ display: "grid", gap: "12px" }}>
        <div>
          <strong>Assigned Staff</strong>
          <div style={{ marginTop: "8px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "999px",
                padding: "7px 11px",
                fontWeight: 800,
                background: order.assigned_to_staff_id ? "#ecfdf5" : "#fff7ed",
                color: order.assigned_to_staff_id ? "#166534" : "#c2410c",
                border: order.assigned_to_staff_id
                  ? "1px solid #bbf7d0"
                  : "1px solid #fdba74",
              }}
            >
              {assignedWorker}
            </span>
          </div>
        </div>

        <div>
          <strong>Assigned At</strong>
          <div style={{ marginTop: "6px" }}>
            {formatAssignedAt(order.assigned_at)}
          </div>
        </div>

        <label style={{ display: "grid", gap: "6px" }}>
          Assign or Reassign
          <select
            value={order.assigned_to_staff_id || ""}
            onChange={(event) => onAssign(event.target.value)}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              padding: "10px",
            }}
          >
            <option value="">Unassigned</option>

            {staffUsers.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
                {staff.role ? ` (${staff.role})` : ""}
              </option>
            ))}
          </select>
        </label>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            padding: "12px 14px",
            borderRadius: "14px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <div>
            <strong>Current Status</strong>
            <div style={{ marginTop: "4px", color: "#475569" }}>{order.status}</div>
          </div>

          {canAdvance ? (
            <button
              type="button"
              onClick={onAdvanceStatus}
              style={{
                background: "#171717",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                padding: "10px 14px",
                fontWeight: 700,
              }}
            >
              Mark {nextStatus}
            </button>
          ) : (
            <span style={{ color: "#64748b", fontWeight: 700 }}>
              Final status reached
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => onAssign("")}
            disabled={!order.assigned_to_staff_id}
            style={{
              border: "1px solid #cbd5e1",
              background: order.assigned_to_staff_id ? "#ffffff" : "#f8fafc",
              color: order.assigned_to_staff_id ? "#171717" : "#94a3b8",
              borderRadius: "12px",
              padding: "10px 14px",
              fontWeight: 700,
            }}
          >
            Clear Assignment
          </button>
        </div>
      </div>
    </section>
  );
}
