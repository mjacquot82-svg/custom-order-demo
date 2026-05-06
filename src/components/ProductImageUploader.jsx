import { useRef } from "react";

export default function ProductImageUploader({
  image,
  onImageChange,
}) {
  const inputRef = useRef(null);

  function triggerUpload() {
    inputRef.current?.click();
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      onImageChange(reader.result);
    };

    reader.readAsDataURL(file);
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "10px",
      }}
    >
      <div
        style={{
          height: "180px",
          borderRadius: "18px",
          border: "1px dashed #cbd5e1",
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {image ? (
          <img
            src={image}
            alt="Product"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <span
            style={{
              color: "#94a3b8",
              fontWeight: 700,
            }}
          >
            No product image uploaded
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <button
        type="button"
        onClick={triggerUpload}
        style={{
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "12px",
          padding: "12px 14px",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        {image ? "Replace Product Image" : "Upload Product Image"}
      </button>
    </div>
  );
}
