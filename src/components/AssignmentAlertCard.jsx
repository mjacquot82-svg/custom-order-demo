export default function AssignmentAlertCard({ count = 0 }) {
  const hasAlerts = count > 0;

  return (
    <section
      style={{
        background: hasAlerts ? "#fffbeb" : "#f8fafc",
        border: `1px solid ${hasAlerts ? "#fde68a" : "#e2e8f0"}`,
        borderRadius: "18px",
        padding: "18px",
        display: "grid",
        gap: "6px",
      }}
    >
      <p
        style={{
          margin: 0,
          color: hasAlerts ? "#92400e" : "#64748b",
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Production Alerts
      </p>

      <h2 style={{ margin: 0, fontSize: "28px", color: "#0f172a" }}>
        {count}
      </h2>

      <p style={{ margin: 0, color: hasAlerts ? "#92400e" : "#64748b", fontWeight: 700 }}>
        {hasAlerts
          ? "Orders are waiting for owner assignment."
          : "No orders currently waiting for assignment."}
      </p>
    </section>
  );
}
