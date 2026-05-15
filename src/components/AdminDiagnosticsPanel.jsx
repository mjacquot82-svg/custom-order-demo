import { Link } from "react-router-dom";

function buildSessionSummary(staffUser) {
  if (!staffUser) {
    return "No active operational session.";
  }

  const parts = [
    `User: ${staffUser.name || "Unknown"}`,
    `Role: ${staffUser.role || "Unknown"}`,
  ];

  if (staffUser.id) {
    parts.push(`Session ID: ${staffUser.id}`);
  }

  if (staffUser.authMode) {
    parts.push(`Auth Mode: ${staffUser.authMode}`);
  }

  return parts.join(" • ");
}

export default function AdminDiagnosticsPanel({
  title = "Workspace unavailable",
  message,
  staffUser = null,
  pathname = "",
  workspaceAccess = "unknown",
  error = null,
}) {
  const details = [
    pathname ? `Route: ${pathname}` : null,
    `Workspace access: ${workspaceAccess}`,
    buildSessionSummary(staffUser),
    error ? `Render error: ${error}` : null,
  ].filter(Boolean);

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "36px 24px 48px" }}>
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #fecaca",
          borderRadius: "24px",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
          padding: "28px",
          display: "grid",
          gap: "16px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#b91c1c",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Workspace Diagnostics
          </p>
          <h1 style={{ margin: "8px 0 10px", fontSize: "30px", color: "#171717" }}>
            {title}
          </h1>
          <p style={{ margin: 0, color: "#57534e", lineHeight: 1.6 }}>
            {message || "The operational session exists, but the workspace could not render safely."}
          </p>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "18px",
            padding: "18px",
            display: "grid",
            gap: "10px",
          }}
        >
          {details.map((detail) => (
            <p key={detail} style={{ margin: 0, color: "#334155", lineHeight: 1.5 }}>
              {detail}
            </p>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link
            to="/admin"
            style={{
              background: "#171717",
              color: "#ffffff",
              textDecoration: "none",
              padding: "12px 16px",
              borderRadius: "12px",
              fontWeight: 800,
            }}
          >
            Go to workspace root
          </Link>

          <Link
            to="/login"
            style={{
              background: "#ffffff",
              color: "#171717",
              textDecoration: "none",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid #d6d3d1",
              fontWeight: 800,
            }}
          >
            Return to login
          </Link>
        </div>
      </section>
    </div>
  );
}
