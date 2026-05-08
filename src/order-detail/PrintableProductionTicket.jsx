import { normalizeProductionType } from "../constants/productionTypes";

function formatPlacements(order) {
  if (Array.isArray(order.placements) && order.placements.length) {
    return order.placements
      .map((item) => item?.placement)
      .filter(Boolean)
      .join(", ");
  }

  return order.placement || "—";
}

export default function PrintableProductionTicket({ order = {} }) {
  const productionType = normalizeProductionType(
    order.decoration_type ||
      order.production_type ||
      "Screen Printing"
  );

  return (
    <section
      style={{
        background: "#ffffff",
        border: "2px dashed #cbd5e1",
        borderRadius: "20px",
        padding: "20px",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Printable Production Ticket</h2>

      <div style={{ display: "grid", gap: "10px" }}>
        <p><strong>Customer:</strong> {order.customer_name || "Walk-in Customer"}</p>

        <p>
          <strong>Assigned Worker:</strong>
          {order.assigned_to_staff_name || "Unassigned"}
        </p>

        <p>
          <strong>Garment:</strong>
          {order.garment || order.item || "Custom garment"}
        </p>

        <p>
          <strong>Placements:</strong>
          {formatPlacements(order)}
        </p>

        <p>
          <strong>Production Type:</strong>
          {productionType}
        </p>

        <p><strong>Quantity:</strong> {order.qty || 0}</p>

        <p><strong>Due Date:</strong> {order.due_date || "—"}</p>

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
