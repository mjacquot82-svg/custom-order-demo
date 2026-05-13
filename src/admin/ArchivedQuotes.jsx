import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { formatShortDate } from "../lib/dateFormatting";
import { useStoredOrders } from "../lib/ordersStore";
import { normalizeOrderFinancials } from "../orders/orderFinancials";
import { isQuoteArchived } from "../quotes/quoteWorkflow";

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function buildArchivedQuotes(orders) {
  return orders
    .filter((order) => isQuoteArchived(order))
    .map((order) => ({
      ...order,
      total: normalizeOrderFinancials(order).total_amount,
    }))
    .sort((left, right) =>
      String(right.quote_archived_at || right.updated_at || "").localeCompare(
        String(left.quote_archived_at || left.updated_at || "")
      )
    );
}

export default function ArchivedQuotes() {
  const location = useLocation();
  const navigate = useNavigate();
  const orders = useStoredOrders();
  const archivedQuotes = useMemo(() => buildArchivedQuotes(orders), [orders]);
  const [flashMessage, setFlashMessage] = useState(() => location.state?.flashMessage || "");
  const [flashTone] = useState(() => location.state?.flashTone || "default");

  useEffect(() => {
    if (!location.state?.flashMessage) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!flashMessage) return;

    const flashTimer = window.setTimeout(() => {
      setFlashMessage("");
    }, 5000);

    return () => window.clearTimeout(flashTimer);
  }, [flashMessage]);

  return (
    <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Records Archive
          </p>
          <h1 style={{ margin: "8px 0 6px" }}>Archived Quotes</h1>
          <p style={{ margin: 0, color: "#475569", maxWidth: "760px", lineHeight: 1.6 }}>
            Historical quote records live here after removal from the active sales workflow. This view is for reference, not operational movement.
          </p>
        </div>

        <Link
          to="/admin/quotes"
          style={{
            background: "#ffffff",
            color: "#171717",
            border: "1px solid #d6dbe4",
            borderRadius: "12px",
            padding: "12px 16px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          View Active Quotes
        </Link>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <article
          style={{
            background: "#f8fafc",
            border: "1px solid #d8e1ea",
            borderRadius: "18px",
            padding: "18px",
          }}
        >
          <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>Archived Records</p>
          <h2 style={{ margin: "8px 0 0", color: "#0f172a" }}>{archivedQuotes.length}</h2>
        </article>
      </section>

      {flashMessage ? (
        <section
          aria-live="polite"
          style={{
            marginBottom: "20px",
            borderRadius: "18px",
            padding: "16px 18px",
            border: flashTone === "success" ? "1px solid #cbd5e1" : "1px solid #cbd5e1",
            background: flashTone === "success" ? "#f8fafc" : "#f8fafc",
            color: "#334155",
            fontWeight: 700,
          }}
        >
          {flashMessage}
        </section>
      ) : null}

      <section
        style={{
          background: "#f8fafc",
          borderRadius: "20px",
          padding: "22px",
          border: "1px solid #d8e1ea",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(120px, 1fr) minmax(180px, 1.6fr) minmax(140px, 1fr) minmax(120px, 1fr) minmax(150px, 1fr) auto",
            gap: "12px",
            padding: "0 4px 12px",
            borderBottom: "1px solid #d8e1ea",
            color: "#64748b",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>Quote #</span>
          <span>Customer</span>
          <span>Archived Date</span>
          <span>Total</span>
          <span>Status</span>
          <span>Record</span>
        </div>

        <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
          {archivedQuotes.length ? (
            archivedQuotes.map((quote) => (
              <article
                key={quote.order_number}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(120px, 1fr) minmax(180px, 1.6fr) minmax(140px, 1fr) minmax(120px, 1fr) minmax(150px, 1fr) auto",
                  gap: "12px",
                  alignItems: "center",
                  padding: "16px",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                }}
              >
                <strong style={{ color: "#0f172a" }}>{quote.order_number || "—"}</strong>
                <span style={{ color: "#334155", fontWeight: 600 }}>
                  {quote.customer_name || "Walk-in Customer"}
                </span>
                <span style={{ color: "#475569" }}>
                  {formatShortDate(quote.quote_archived_at || quote.updated_at)}
                </span>
                <strong style={{ color: "#0f172a" }}>{money(quote.total)}</strong>
                <span style={{ color: "#475569", fontWeight: 600 }}>
                  {quote.quote_status || "Archived"}
                </span>
                <Link
                  to={`/admin/quotes/${quote.order_number}`}
                  style={{
                    justifySelf: "start",
                    color: "#0f172a",
                    textDecoration: "none",
                    fontWeight: 800,
                  }}
                >
                  View
                </Link>
              </article>
            ))
          ) : (
            <div
              style={{
                border: "1px dashed #cbd5e1",
                borderRadius: "18px",
                padding: "28px",
                color: "#64748b",
                background: "#ffffff",
              }}
            >
              No archived quotes yet. Active quote workflow remains separate until records are intentionally archived.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
