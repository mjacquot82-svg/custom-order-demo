import { formatDateTime } from "../lib/dateFormatting";

export default function ArtworkPreviewPanel({ artwork = [] }) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "20px",
        padding: "20px",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Artwork Preview</h2>

      {!artwork.length ? (
        <p style={{ color: "#94a3b8" }}>
          No artwork uploaded yet.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {artwork.map((file) => (
            <article
              key={file.id || file.name}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "12px",
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  overflow: "hidden",
                  marginBottom: "10px",
                }}
              >
                {file.preview && file.type?.startsWith("image/") ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    style={{
                      width: "100%",
                      maxHeight: "220px",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div style={{ padding: "18px" }}>
                    {file.name}
                  </div>
                )}
              </div>

              <strong>{file.name}</strong>

              <div
                style={{
                  marginTop: "6px",
                  display: "grid",
                  gap: "4px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                <span>
                  Uploaded by:
                  {file.uploaded_by_staff_name || "Unknown Staff"}
                </span>

                <span>
                  Uploaded:
                  {formatDateTime(file.uploaded_at)}
                </span>

                <span>
                  Type:
                  {file.type || "Unknown"}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
