import { PRODUCTION_TYPES } from "../constants/productionTypes";

export default function ProductionTypeSelect({
  value,
  onChange,
  label = "Production Type",
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: "8px",
        fontWeight: 700,
        color: "#292524",
      }}
    >
      {label}

      <select
        value={value}
        onChange={onChange}
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: "12px",
          padding: "12px 14px",
          fontSize: "15px",
          width: "100%",
          boxSizing: "border-box",
          background: "#ffffff",
        }}
      >
        {PRODUCTION_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </label>
  );
}
