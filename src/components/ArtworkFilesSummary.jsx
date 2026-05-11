import { getArtworkDisplayName } from "../lib/orderArtwork";

const headingStyle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "18px",
  fontWeight: 800,
};

const captionStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: "13px",
};

export default function ArtworkFilesSummary({
  artwork = [],
  title = "Artwork Files",
  subtitle = "Production asset references attached to this order.",
  emptyMessage = "No artwork files attached to this order.",
  compact = false,
}) {
  return (
    <section
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: compact ? "16px" : "20px",
        padding: compact ? "14px" : "18px",
        background:
          "linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.98) 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "grid", gap: "4px" }}>
          <h3 style={headingStyle}>{title}</h3>
          <p style={captionStyle}>{subtitle}</p>
        </div>

        <div
          style={{
            borderRadius: "999px",
            padding: "7px 11px",
            background: "#dbeafe",
            color: "#1d4ed8",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {artwork.length} file{artwork.length === 1 ? "" : "s"}
        </div>
      </div>

      {artwork.length ? (
        <div style={{ display: "grid", gap: "8px" }}>
          {artwork.map((file, index) => (
            <div
              key={file.id || `${getArtworkDisplayName(file)}-${index}`}
              style={{
                display: "grid",
                gap: "4px",
                padding: compact ? "10px 12px" : "12px 14px",
                borderRadius: "14px",
                background: "#ffffff",
                border: "1px solid #dbe2ea",
              }}
            >
              <strong style={{ color: "#111827", fontSize: "14px", lineHeight: 1.35 }}>
                {getArtworkDisplayName(file)}
              </strong>

              {(file.placement_hint || file.type || file.file_type) && (
                <span style={{ color: "#64748b", fontSize: "12px" }}>
                  {[file.placement_hint, file.type || file.file_type].filter(Boolean).join(" • ")}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, color: "#94a3b8" }}>{emptyMessage}</p>
      )}
    </section>
  );
}
