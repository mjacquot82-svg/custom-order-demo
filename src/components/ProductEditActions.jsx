export default function ProductEditActions({
  isEditing,
  onEdit,
  onCancel,
  onDelete,
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: "8px",
        justifyItems: "end",
      }}
    >
      {!isEditing ? (
        <button
          type="button"
          onClick={onEdit}
          style={{
            background: "#171717",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            padding: "9px 12px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Edit Product
        </button>
      ) : (
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: "#171717",
            borderRadius: "10px",
            padding: "9px 12px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Cancel Editing
        </button>
      )}

      <button
        type="button"
        onClick={onDelete}
        style={{
          background: "#ffffff",
          border: "1px solid #fecaca",
          color: "#991b1b",
          borderRadius: "10px",
          padding: "9px 12px",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Remove Product
      </button>
    </div>
  );
}
