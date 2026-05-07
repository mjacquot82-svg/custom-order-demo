function formatTimestamp(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ActivityTimeline({ events = [] }) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "20px",
        padding: "20px",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Activity Timeline</h2>

      {!events.length ? (
        <p style={{ color: "#94a3b8" }}>
          No activity recorded yet.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {events.map((event, index) => (
            <article
              key={event.id || index}
              style={{
                borderLeft: "4px solid #171717",
                background: "#f8fafc",
                borderRadius: "12px",
                padding: "12px",
              }}
            >
              <strong>
                {event.note || "Order activity recorded."}
              </strong>

              <div
                style={{
                  marginTop: "4px",
                  color: "#64748b",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                {event.staff_name || "Unknown Staff"}
                {event.staff_role
                  ? ` (${event.staff_role})`
                  : ""}

                {event.created_at
                  ? ` • ${formatTimestamp(event.created_at)}`
                  : ""}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
