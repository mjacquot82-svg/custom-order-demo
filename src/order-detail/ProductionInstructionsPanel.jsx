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

const rowLabelStyle = {
  color: "#57534e",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const rowValueStyle = {
  color: "#171717",
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: 1.32,
};

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
        padding: "18px",
      }}
    >
      <div style={{ display: "grid", gap: "4px", marginBottom: "14px" }}>
        <span
          style={{
            color: "#78716c",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Production Instructions
        </span>
        <h2 style={{ margin: 0, fontSize: "22px", lineHeight: 1.1 }}>
          {order.order_number || "Unnumbered Order"}
        </h2>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        <div style={{ display: "grid", gap: "2px" }}>
          <span style={rowLabelStyle}>Customer</span>
          <span style={rowValueStyle}>{order.customer_name || "Walk-in Customer"}</span>
        </div>

        <div style={{ display: "grid", gap: "2px" }}>
          <span style={rowLabelStyle}>Garment</span>
          <span style={rowValueStyle}>{order.garment || order.item || "Custom garment"}</span>
        </div>

        <div style={{ display: "grid", gap: "2px" }}>
          <span style={rowLabelStyle}>Placements</span>
          <span style={rowValueStyle}>{formatPlacements(order)}</span>
        </div>

        <div style={{ display: "grid", gap: "2px" }}>
          <span style={rowLabelStyle}>Production Type</span>
          <span style={rowValueStyle}>{productionType}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
          <div style={{ display: "grid", gap: "2px" }}>
            <span style={rowLabelStyle}>Quantity</span>
            <span style={rowValueStyle}>{order.qty || 0}</span>
          </div>

          <div style={{ display: "grid", gap: "2px" }}>
            <span style={rowLabelStyle}>Due Date</span>
            <span style={rowValueStyle}>{order.due_date || "—"}</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: "2px" }}>
          <span style={rowLabelStyle}>Deposit</span>
          <span style={rowValueStyle}>
            {order.deposit?.status || "not set"}
            {order.deposit?.amount ? ` • ${money(order.deposit.amount)}` : ""}
          </span>
        </div>

        <div style={{ display: "grid", gap: "2px" }}>
          <span style={rowLabelStyle}>Approval Status</span>
          <span style={rowValueStyle}>{order.approval_status || "Not Sent"}</span>
        </div>

        <div style={{ display: "grid", gap: "2px" }}>
          <span style={rowLabelStyle}>Production Notes</span>
          <span style={{ ...rowValueStyle, whiteSpace: "pre-wrap" }}>
            {order.production_notes || "—"}
          </span>
        </div>

        <div style={{ display: "grid", gap: "2px" }}>
          <span style={rowLabelStyle}>Internal Notes</span>
          <span style={{ ...rowValueStyle, whiteSpace: "pre-wrap" }}>
            {order.internal_note || "—"}
          </span>
        </div>
      </div>
    </section>
  );
}
