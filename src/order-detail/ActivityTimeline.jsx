import { formatDateTime } from "../lib/dateFormatting";

export default function ActivityTimeline({ events = [] }) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "20px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ marginBottom: "18px" }}>
        <h2 style={{ margin: "0 0 4px" }}>Activity Timeline</h2>
        <p style={{ margin: 0, color: "#64748b" }}>
          Operational event history for payments, production, and pickup workflow.
        </p>
      </div>

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
                  ? ` • ${formatDateTime(event.created_at)}`
                  : ""}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
