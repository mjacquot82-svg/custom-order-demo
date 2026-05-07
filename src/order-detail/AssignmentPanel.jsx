export default function AssignmentPanel({
  order,
  staffUsers = [],
  onAssign,
  onStart,
  onPause,
  onComplete,
}) {
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
          <strong>Assigned Worker</strong>
          <div style={{ marginTop: "6px" }}>
            {order.assigned_to_staff_name || "Unassigned"}
          </div>
        </div>

        <div>
          <strong>Assigned At</strong>
          <div style={{ marginTop: "6px" }}>
            {order.assigned_at || "Not assigned yet"}
          </div>
        </div>

        <label style={{ display: "grid", gap: "6px" }}>
          Reassign Worker
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
              </option>
            ))}
          </select>
        </label>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onStart}
            style={{
              background: "#171717",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "10px 14px",
              fontWeight: 700,
            }}
          >
            Start Production
          </button>

          <button
            type="button"
            onClick={onPause}
            style={{
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              borderRadius: "12px",
              padding: "10px 14px",
              fontWeight: 700,
            }}
          >
            Pause
          </button>

          <button
            type="button"
            onClick={onComplete}
            style={{
              border: "1px solid #86efac",
              background: "#ecfdf5",
              color: "#166534",
              borderRadius: "12px",
              padding: "10px 14px",
              fontWeight: 700,
            }}
          >
            Complete
          </button>
        </div>
      </div>
    </section>
  );
}
