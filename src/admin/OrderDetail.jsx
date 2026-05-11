import { useParams, Link } from "react-router-dom";
import { useMemo } from "react";
import { recordStoredOrderPayment, updateStoredOrder, useStoredOrders } from "../lib/ordersStore";
import { useStoredProducts } from "../lib/productsStore";
import { getActiveStaffUser, getStoredStaffUsers } from "../lib/staffUsersStore";
import { generateQuoteSnapshot } from "../lib/quoteEngine";
import { printProductionSheet } from "../lib/printProductionSheet";
import PricingSummary from "../components/PricingSummary";
import ArtworkFilesSummary from "../components/ArtworkFilesSummary";
import StatusBadge from "../components/StatusBadge";
import ProductionProgressTracker from "../order-detail/ProductionProgressTracker";
import AssignmentPanel from "../order-detail/AssignmentPanel";
import ActivityTimeline from "../order-detail/ActivityTimeline";
import ProductionInstructionsPanel from "../order-detail/ProductionInstructionsPanel";
import ArtworkPreviewPanel from "../order-detail/ArtworkPreviewPanel";
import FinancialSummaryPanel from "../order-detail/FinancialSummaryPanel";
import { buildOrderUrgency } from "../order-detail/buildOrderUrgency";
import { normalizeOrderFinancials } from "../orders/orderFinancials";
import { formatDateTimeParts } from "../lib/dateFormatting";
import { getOrderArtworkFiles } from "../lib/orderArtwork";
import {
  getNextOperationalStatus,
  normalizeOperationalStatus,
} from "../orders/orderWorkflow";

const cardStyle = {
  background: "#ffffff",
  borderRadius: "20px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const sectionLabelStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const sectionValueStyle = {
  margin: "4px 0 0",
  color: "#171717",
  fontWeight: 700,
  lineHeight: 1.45,
};

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function buildSizeBreakdownEntries(sizeBreakdown = {}) {
  return Object.entries(sizeBreakdown).filter(([, quantity]) => Number(quantity) > 0);
}

export default function OrderDetail() {
  const { orderNumber } = useParams();
  const storedOrders = useStoredOrders();
  const storedProducts = useStoredProducts();
  const order = useMemo(
    () => storedOrders.find((entry) => entry.order_number === orderNumber) || null,
    [orderNumber, storedOrders]
  );
  const staffUsers = getStoredStaffUsers().filter((staffUser) => staffUser.status !== "Inactive");

  const selectedProduct = useMemo(() => {
    if (!order) return null;

    return storedProducts.find(
      (product) =>
        product.id === order.product_id ||
        product.name === order.garment
    );
  }, [order, storedProducts]);

  const quoteSnapshot = useMemo(() => {
    if (!order) return null;
    return generateQuoteSnapshot(order, selectedProduct);
  }, [order, selectedProduct]);
  const normalizedOrder = useMemo(() => {
    if (!order) return null;

    return normalizeOrderFinancials(order, {
      additionalSources: quoteSnapshot
        ? [{ label: "generatedQuoteSnapshot", value: quoteSnapshot }]
        : [],
    });
  }, [order, quoteSnapshot]);

  if (!order) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
        <h1>Order not found</h1>
        <Link to="/admin/orders">Back to Production Orders</Link>
      </div>
    );
  }

  const urgency = buildOrderUrgency(order);

  function saveOrderUpdates(updates) {
    const activeStaff = getActiveStaffUser();

    const updated = updateStoredOrder(orderNumber, {
      updated_by_staff_name: activeStaff?.name || "Unknown Staff",
      updated_by_staff_role: activeStaff?.role || "",
      ...updates,
    });

    return updated;
  }

  function handleAssign(staffId) {
    const worker = staffUsers.find((staff) => staff.id === staffId);
    const previousAssignment = order.assigned_to_staff_name || "";
    const nextAssignment = worker?.name || "";

    let activityNote = "Assignment unchanged.";
    if (!previousAssignment && nextAssignment) {
      activityNote = `Assigned to ${nextAssignment}.`;
    } else if (previousAssignment && !nextAssignment) {
      activityNote = `Unassigned from ${previousAssignment}.`;
    } else if (previousAssignment && nextAssignment && previousAssignment !== nextAssignment) {
      activityNote = `Reassigned from ${previousAssignment} to ${nextAssignment}.`;
    }

    saveOrderUpdates({
      assigned_to_staff_id: worker?.id || "",
      assigned_to_staff_name: worker?.name || "",
      assigned_to_staff_role: worker?.role || "",
      assigned_at: worker ? new Date().toISOString() : null,
      needs_assignment: !worker,
      activity_type: "assignment",
      activity_note: activityNote,
    });
  }

  function handleAdvanceStatus() {
    const nextStatus = getNextOperationalStatus(order.status);
    const now = new Date().toISOString();
    const nextUpdates = {
      status: nextStatus,
      activity_type: "status_change",
      activity_note: `Status changed to ${nextStatus}.`,
    };

    if (normalizeOperationalStatus(nextStatus) === "In Production") {
      nextUpdates.production_started_at = order.production_started_at || now;
      nextUpdates.production_ready = true;
    }

    if (normalizeOperationalStatus(nextStatus) === "Completed") {
      nextUpdates.completed_at = now;
    }

    saveOrderUpdates(nextUpdates);
  }

  function handlePrintTicket() {
    printProductionSheet(printOrder, {
      title: `Production Sheet ${order.order_number || orderNumber}`,
    });
  }

  function handleRecordPayment(paymentInput) {
    return recordStoredOrderPayment(orderNumber, paymentInput, {
      financialOptions: {
        additionalSources: quoteSnapshot
          ? [{ label: "generatedQuoteSnapshot", value: quoteSnapshot }]
          : [],
      },
    });
  }

  function handleMarkPickedUp() {
    const now = new Date().toISOString();
    const balanceNote =
      normalizedOrder.balance_due > 0
        ? ` Outstanding balance: ${money(normalizedOrder.balance_due)}.`
        : "";

    saveOrderUpdates({
      pickup_status: "Picked Up",
      picked_up_at: order.picked_up_at || now,
      status:
        normalizeOperationalStatus(order.status) === "Ready for Pickup"
          ? "Picked Up"
          : order.status,
      activity_type: "pickup",
      activity_note: `Order marked as picked up.${balanceNote}`,
    });
  }

  function handleSendDepositRequest(requestDetails = {}) {
    const now = new Date().toISOString();

    saveOrderUpdates({
      deposit: {
        ...(order.deposit || {}),
        amount: normalizedOrder.deposit_amount,
        status: "pending",
        requested_at: now,
        updated_at: now,
        request_channel: requestDetails.channel || "",
        last_requested_subject: requestDetails.subject || "",
        last_requested_message: requestDetails.body || "",
      },
      activity_type: "deposit_request",
      activity_note: `Deposit request prepared via ${requestDetails.channel || "manual workflow"}.`,
    });
  }

  const placedAt = formatDateTimeParts(order.created_at);
  const updatedAt = formatDateTimeParts(order.updated_at);
  const sizeBreakdownEntries = buildSizeBreakdownEntries(order.size_breakdown);
  const printOrder = normalizedOrder || order;
  const artworkFiles = getOrderArtworkFiles(order);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#78716c",
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Production Command Center
          </p>

          <h1 style={{ margin: "6px 0" }}>
            Order {order.order_number || orderNumber}
          </h1>

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <StatusBadge status={order.status} />

            <span
              style={{
                color: urgency.color,
                fontWeight: 800,
              }}
            >
              {urgency.label}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gap: "8px",
              marginTop: "14px",
              padding: "14px 16px",
              borderRadius: "16px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              maxWidth: "420px",
            }}
          >
            <div>
              <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Placed
              </p>
              <p style={{ margin: "4px 0 0", color: "#171717", fontWeight: 700 }}>
                {placedAt.date} — {placedAt.time}
              </p>
            </div>

            <div>
              <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Last Updated
              </p>
              <p style={{ margin: "4px 0 0", color: "#171717", fontWeight: 700 }}>
                {updatedAt.date} — {updatedAt.time}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            to="/admin/orders"
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              padding: "11px 14px",
              textDecoration: "none",
              color: "#171717",
              fontWeight: 700,
            }}
          >
            Orders
          </Link>

          <button
            type="button"
            onClick={handlePrintTicket}
            style={{
              background: "#171717",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "11px 14px",
              fontWeight: 700,
            }}
          >
            Print Production Sheet
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "18px" }}>
        <ProductionProgressTracker order={order} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
          gap: "18px",
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: "18px" }}>
          <section style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "14px",
                flexWrap: "wrap",
                marginBottom: "18px",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 4px" }}>Customer & Order Items</h2>
                <p style={{ margin: 0, color: "#64748b" }}>
                  Core intake details for production and fulfillment.
                </p>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: "999px",
                  padding: "8px 12px",
                  background: "#f1f5f9",
                  color: "#0f172a",
                  fontWeight: 800,
                  fontSize: "13px",
                }}
              >
                Qty {order.qty || 0}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "18px",
              }}
            >
              <div>
                <p style={sectionLabelStyle}>Customer</p>
                <p style={sectionValueStyle}>{order.customer_name || "Walk-in Customer"}</p>
              </div>

              <div>
                <p style={sectionLabelStyle}>Garment</p>
                <p style={sectionValueStyle}>{order.garment || order.item || "Custom garment"}</p>
              </div>

              <div>
                <p style={sectionLabelStyle}>Placements</p>
                <p style={sectionValueStyle}>
                  {Array.isArray(order.placements) && order.placements.length
                    ? order.placements
                        .map((placement) => placement?.placement)
                        .filter(Boolean)
                        .join(", ")
                    : order.placement || "—"}
                </p>
              </div>

              <div>
                <p style={sectionLabelStyle}>Assigned</p>
                <p style={sectionValueStyle}>{order.assigned_to_staff_name || "Unassigned"}</p>
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid #e2e8f0",
                paddingTop: "18px",
                display: "grid",
                gap: "12px",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "16px" }}>Size Breakdown</h3>
                <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                  Recorded quantities for the production team.
                </p>
              </div>

              {sizeBreakdownEntries.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {sizeBreakdownEntries.map(([size, quantity]) => (
                    <div
                      key={size}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "12px",
                        background: "#f8fafc",
                      }}
                    >
                      <p style={sectionLabelStyle}>{size}</p>
                      <p style={{ ...sectionValueStyle, fontSize: "18px" }}>{quantity}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: "#94a3b8" }}>
                  No size breakdown recorded for this order yet.
                </p>
              )}
            </div>
          </section>

          <ArtworkFilesSummary
            artwork={artworkFiles}
            title="Artwork Files"
            subtitle="Operational production references for this order."
            emptyMessage="No artwork files have been attached yet."
          />

          <ProductionInstructionsPanel order={order} />

          <AssignmentPanel
            order={order}
            staffUsers={staffUsers}
            onAssign={handleAssign}
            onAdvanceStatus={handleAdvanceStatus}
          />
        </div>

        <aside style={{ display: "grid", gap: "18px" }}>
          <FinancialSummaryPanel
            order={normalizedOrder}
            onRecordPayment={handleRecordPayment}
            onMarkPickedUp={handleMarkPickedUp}
            onSendDepositRequest={handleSendDepositRequest}
          />

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Quote Snapshot</h2>

            {quoteSnapshot ? (
              <PricingSummary
                quote={quoteSnapshot}
                quantity={quoteSnapshot.quantity || order.qty || 0}
                compact
              />
            ) : (
              <p style={{ color: "#94a3b8" }}>
                Quote snapshot unavailable.
              </p>
            )}
          </section>

          <ArtworkPreviewPanel
            artwork={artworkFiles}
          />
        </aside>
      </div>

      <div style={{ marginTop: "18px" }}>
        <ActivityTimeline
          events={order.activity_log || []}
        />
      </div>
    </div>
  );
}
