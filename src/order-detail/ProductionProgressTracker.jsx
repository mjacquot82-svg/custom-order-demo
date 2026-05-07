const workflowStages = [
  "Quote",
  "Approval",
  "Deposit",
  "Production",
  "Ready",
  "Picked Up",
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getCurrentStageIndex(order = {}) {
  const status = normalize(order.status);

  if (["completed", "picked up"].includes(status)) return 5;
  if (status === "ready for pickup") return 4;
  if (["in production", "printing", "ready for production"].includes(status)) return 3;
  if (status.includes("deposit")) return 2;
  if (["approved", "awaiting approval"].includes(status)) return 1;

  return 0;
}

export default function ProductionProgressTracker({ order }) {
  const currentStage = getCurrentStageIndex(order);

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "20px",
        padding: "18px",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Production Workflow</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "10px",
        }}
      >
        {workflowStages.map((stage, index) => {
          const complete = index < currentStage;
          const active = index === currentStage;

          return (
            <div
              key={stage}
              style={{
                border: active
                  ? "1px solid #171717"
                  : complete
                  ? "1px solid #86efac"
                  : "1px solid #e2e8f0",
                background: active
                  ? "#171717"
                  : complete
                  ? "#ecfdf5"
                  : "#f8fafc",
                color: active
                  ? "#ffffff"
                  : complete
                  ? "#166534"
                  : "#64748b",
                borderRadius: "14px",
                padding: "12px",
                textAlign: "center",
                fontWeight: 800,
              }}
            >
              {stage}
            </div>
          );
        })}
      </div>
    </section>
  );
}
