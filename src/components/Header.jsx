import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #e7e5e4",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: "72px",
          fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            flex: "1 1 auto",
            minWidth: "24px",
          }}
        />

        <nav
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <Link
            to="/my-orders"
            style={{
              textDecoration: "none",
              color: "#171717",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            My Orders
          </Link>

          <Link
            to="/login"
            style={{
              textDecoration: "none",
              color: "#57534e",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
