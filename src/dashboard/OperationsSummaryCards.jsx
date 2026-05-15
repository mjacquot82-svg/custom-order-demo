export default function OperationsSummaryCards({ metrics }) {
  const cards = [
    {
      label: "Overdue Orders",
      value: metrics.overdue,
      color: "#b91c1c",
      background: "#fef2f2",
    },
    {
      label: "Due Today",
      value: metrics.dueToday,
      color: "#b45309",
      background: "#fffbeb",
    },
    {
      label: "Active Production",
      value: metrics.activeProduction,
      color: "#166534",
      background: "#ecfdf5",
    },
    {
      label: "Ready for Pickup",
      value: metrics.readyForPickup,
      color: "#1d4ed8",
      background: "#eff6ff",
    },
    {
      label: "Unassigned",
      value: metrics.needsAssignment,
      color: "#7c2d12",
      background: "#fff7ed",
    },
  ];

  return (
    <div
      className="owner-dashboard-summary-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: "10px",
      }}
    >
      {cards.map((card) => (
        <article
          className="owner-dashboard-summary-card"
          key={card.label}
          style={{
            background: card.background,
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "14px",
          }}
        >
          <div
            style={{
              color: card.color,
              fontSize: "26px",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {card.value}
          </div>

          <div
            style={{
              marginTop: "5px",
              color: "#334155",
              fontWeight: 700,
              lineHeight: 1.35,
              fontSize: "13px",
            }}
          >
            {card.label}
          </div>
        </article>
      ))}
    </div>
  );
}
