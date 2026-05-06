export default function ProductPricingFields({
  form,
  updateField,
  fieldStyle,
  labelStyle,
}) {
  const cost = Number(form.cost_price || 0);
  const markup = Number(form.markup_percentage || 0);
  const calculatedBasePrice = Number(
    (cost + cost * (markup / 100)).toFixed(2)
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "12px",
      }}
    >
      <label style={labelStyle}>
        Garment Cost
        <input
          type="number"
          min="0"
          step="0.01"
          name="cost_price"
          value={form.cost_price || ""}
          onChange={updateField}
          placeholder="0.00"
          style={fieldStyle}
        />
      </label>

      <label style={labelStyle}>
        Markup %
        <input
          type="number"
          min="0"
          step="1"
          name="markup_percentage"
          value={form.markup_percentage || ""}
          onChange={updateField}
          placeholder="65"
          style={fieldStyle}
        />
      </label>

      <div
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: "12px",
          padding: "12px 14px",
          background: "#f8fafc",
          display: "grid",
          alignContent: "center",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 800,
            color: "#64748b",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Base Sell Price
        </span>

        <strong
          style={{
            fontSize: "24px",
            color: "#0f172a",
          }}
        >
          ${calculatedBasePrice.toFixed(2)}
        </strong>

        <span
          style={{
            color: "#64748b",
            fontSize: "12px",
          }}
        >
          Before printing or decoration charges.
        </span>
      </div>
    </div>
  );
}
