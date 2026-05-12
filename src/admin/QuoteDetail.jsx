import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import PricingSummary from "../components/PricingSummary";
import { updateStoredOrder, useStoredOrders } from "../lib/ordersStore";
import { useStoredProducts } from "../lib/productsStore";
import { normalizeOrderFinancials } from "../orders/orderFinancials";
import {
  canAdvanceQuoteStatus,
  getNextQuoteStatus,
  isQuoteReadyForProduction,
} from "../quotes/quoteWorkflow";

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function cardStyle(background = "#ffffff") {
  return {
    background,
    borderRadius: "20px",
    padding: "22px",
    border: "1px solid #e2e8f0",
  };
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: 800 }}>{label}</p>
      <strong style={{ display: "block", marginTop: "6px", color: "#171717" }}>{value || "—"}</strong>
    </div>
  );
}

export default function QuoteDetail() {
  const { orderNumber } = useParams();
  const orders = useStoredOrders();
  const products = useStoredProducts();
  const order = useMemo(
    () => orders.find((entry) => entry.order_number === orderNumber) || null,
    [orderNumber, orders]
  );
  const product = useMemo(
    () =>
      products.find(
        (entry) => entry.id === order?.product_id || entry.name === order?.garment
      ) || null,
    [order, products]
  );
  const quoteSnapshot = order?.quote || null;
  const financials = useMemo(
    () =>
      order
        ? normalizeOrderFinancials(order, {
            additionalSources: quoteSnapshot ? [{ label: "storedQuote", value: quoteSnapshot }] : [],
          })
        : null,
    [order, quoteSnapshot]
  );

  if (!order) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
        <h1>Quote not found</h1>
        <Link to="/admin/quotes">Back to Quotes</Link>
      </div>
    );
  }

  function handleAdvanceQuote() {
    if (!canAdvanceQuoteStatus(order.quote_status)) return;

    const nextQuoteStatus = getNextQuoteStatus(order.quote_status);
    updateStoredOrder(order.order_number, {
      quote_status: nextQuoteStatus,
      activity_type: "quote_status",
      activity_note: `Quote status changed to ${nextQuoteStatus}.`,
    });
  }

  function handleReleaseToProduction() {
    if (!isQuoteReadyForProduction(order.quote_status)) return;

    updateStoredOrder(order.order_number, {
      quote_status: "Ready For Production",
      status: "Awaiting Production",
      operational_visible: true,
      production_ready: true,
      activity_type: "release_to_production",
      activity_note: "Quote released into Production Orders.",
    });
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
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
            Quote Workflow
          </p>
          <h1 style={{ margin: "6px 0" }}>Quote {order.order_number}</h1>
          <p style={{ margin: 0, color: "#475569", maxWidth: "760px" }}>
            Sales-stage workspace for approvals, artwork confirmation, and deposit readiness before production release.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            to="/admin/quotes"
            style={{
              background: "#ffffff",
              color: "#171717",
              border: "1px solid #d6dbe4",
              borderRadius: "12px",
              padding: "11px 14px",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Back to Quotes
          </Link>
          {canAdvanceQuoteStatus(order.quote_status) ? (
            <button
              type="button"
              onClick={handleAdvanceQuote}
              style={{
                border: "none",
                background: "#0f172a",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "11px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Mark {getNextQuoteStatus(order.quote_status)}
            </button>
          ) : null}
          {isQuoteReadyForProduction(order.quote_status) ? (
            <button
              type="button"
              onClick={handleReleaseToProduction}
              style={{
                border: "none",
                background: "#166534",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "11px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Release to Production
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gap: "18px" }}>
        <section style={cardStyle("#f8fafc")}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
            }}
          >
            <DetailItem label="Customer" value={order.customer_name} />
            <DetailItem label="Company" value={order.customer_company} />
            <DetailItem label="Quote Status" value={order.quote_status} />
            <DetailItem label="Source" value={order.source} />
            <DetailItem label="Due Date" value={order.due_date} />
            <DetailItem label="Artwork Required" value={order.artwork_files?.length ? "Attached" : "Pending"} />
          </div>
        </section>

        <section style={cardStyle()}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <DetailItem label="Garment" value={order.garment} />
            <DetailItem label="Decoration Type" value={order.decoration_type} />
            <DetailItem label="Quantity" value={order.qty} />
            <DetailItem label="Placements" value={(order.placements || []).map((entry) => entry.placement).join(", ")} />
          </div>
          {order.notes ? (
            <div style={{ marginTop: "16px" }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: 800 }}>Notes</p>
              <p style={{ margin: "6px 0 0", color: "#171717" }}>{order.notes}</p>
            </div>
          ) : null}
        </section>

        <section style={cardStyle()}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              marginBottom: "18px",
            }}
          >
            <DetailItem label="Quote Total" value={money(financials?.total_amount)} />
            <DetailItem label="Deposit Target" value={money(financials?.deposit_amount)} />
            <DetailItem label="Paid To Date" value={money(financials?.amount_paid)} />
            <DetailItem label="Balance Owing" value={money(financials?.balance_due)} />
          </div>

          {quoteSnapshot ? (
            <PricingSummary quote={quoteSnapshot} quantity={order.qty} />
          ) : (
            <p style={{ margin: 0, color: "#64748b" }}>
              Quote pricing snapshot will appear here once pricing data is available.
            </p>
          )}
        </section>

        <section style={cardStyle("#fff7ed")}>
          <h2 style={{ marginTop: 0 }}>Production Release Rule</h2>
          <p style={{ margin: 0, color: "#7c2d12", lineHeight: 1.6 }}>
            A quote becomes a production order only after approval, deposit confirmation, and artwork approval where required. This page keeps that operational boundary explicit.
          </p>
        </section>
      </div>
    </div>
  );
}
