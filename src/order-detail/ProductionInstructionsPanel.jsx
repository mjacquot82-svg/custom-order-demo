import { normalizeProductionType } from "../constants/productionTypes";

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatPlacements(order) {
  if (Array.isArray(order.placements) && order.placements.length) {
    return order.placements
      .map((item) => item?.placement)
      .filter(Boolean)
      .join(", ");
  }

  return order.placement || "—";
}

export default function ProductionInstructionsPanel({ order = {} }) {
  const productionType = normalizeProductionType(
    order.decoration_type ||
      order.production_type ||
      "Screen Printing"
  );

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "20px",
        padding: "20px",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Production Instructions</h2>

      <div style={{ display: "grid", gap: "10px" }}>
        <p><strong>Customer:</strong> {order.customer_name || "Walk-in Customer"}</p>

        <p><strong>Garment:</strong> {order.garment || order.item || "Custom garment"}</p>

        <p><strong>Placements:</strong> {formatPlacements(order)}</p>

        <p><strong>Production Type:</strong> {productionType}</p>

        <p><strong>Quantity:</strong> {order.qty || 0}</p>

        <p><strong>Due Date:</strong> {order.due_date || "—"}</p>

        <p>
          <strong>Deposit:</strong>
          {order.deposit?.status || "not set"}
          {order.deposit?.amount
            ? ` • ${money(order.deposit.amount)}`
            : ""}
        </p>

        <p>
          <strong>Approval Status:</strong>
          {order.approval_status || "Not Sent"}
        </p>

        <p>
          <strong>Production Notes:</strong>
          {order.production_notes || "—"}
        </p>

        <p>
          <strong>Internal Notes:</strong>
          {order.internal_note || "—"}
        </p>
      </div>
    </section>
  );
}
