import { useParams, Link } from "react-router-dom";
import { useMemo, useRef } from "react";
import { updateStoredOrder, useStoredOrders } from "../lib/ordersStore";
import { useStoredProducts } from "../lib/productsStore";
import { getActiveStaffUser, getStoredStaffUsers } from "../lib/staffUsersStore";
import { generateQuoteSnapshot } from "../lib/quoteEngine";
import { printElement } from "../lib/printElement";
import PricingSummary from "../components/PricingSummary";
import StatusBadge from "../components/StatusBadge";
import ProductionProgressTracker from "../order-detail/ProductionProgressTracker";
import AssignmentPanel from "../order-detail/AssignmentPanel";
import ActivityTimeline from "../order-detail/ActivityTimeline";
import ProductionInstructionsPanel from "../order-detail/ProductionInstructionsPanel";
import ArtworkPreviewPanel from "../order-detail/ArtworkPreviewPanel";
import PrintableProductionTicket from "../order-detail/PrintableProductionTicket";
import FinancialSummaryPanel from "../order-detail/FinancialSummaryPanel";
import { buildOrderUrgency } from "../order-detail/buildOrderUrgency";
import { deriveOrderFinancials, normalizeOrderFinancials } from "../orders/orderFinancials";
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

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function OrderDetail() {
  const { orderNumber } = useParams();
  const storedOrders = useStoredOrders();
  const storedProducts = useStoredProducts();
  const printableTicketRef = useRef(null);
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
      updated_at: new Date().toISOString(),
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
    printElement(printableTicketRef.current, {
      title: `Production Ticket ${order.order_number || orderNumber}`,
    });
  }

  function handleRecordPayment(paymentInput) {
    const activeStaff = getActiveStaffUser();
    const paymentEntry = {
      id: `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      amount: Number(paymentInput.amount) || 0,
      method: paymentInput.method || "Other",
      timestamp: new Date().toISOString(),
      staff_member: activeStaff?.name || "Unknown Staff",
      note: String(paymentInput.note || "").trim(),
    };
    const paymentHistory = [paymentEntry, ...(order.payment_history || [])];
    const nextFinancials = deriveOrderFinancials({
      ...order,
      payment_history: paymentHistory,
    }, {
      additionalSources: quoteSnapshot
        ? [{ label: "generatedQuoteSnapshot", value: quoteSnapshot }]
        : [],
    });
    const paymentNote = paymentEntry.note ? ` Note: ${paymentEntry.note}` : "";
    const statusNote =
      nextFinancials.payment_status === "Paid in Full"
        ? " Order is now paid in full."
        : ` Remaining balance: ${money(nextFinancials.balance_due)}.`;

    saveOrderUpdates({
      payment_history: paymentHistory,
      activity_type: "payment",
      activity_note: `Recorded payment of ${money(paymentEntry.amount)} via ${paymentEntry.method}.${paymentNote}${statusNote}`,
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
            Print Ticket
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
          <AssignmentPanel
            order={order}
            staffUsers={staffUsers}
            onAssign={handleAssign}
            onAdvanceStatus={handleAdvanceStatus}
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

          <FinancialSummaryPanel
            order={normalizedOrder}
            onRecordPayment={handleRecordPayment}
            onMarkPickedUp={handleMarkPickedUp}
          />

          <ActivityTimeline
            events={order.activity_log || []}
          />
        </div>

        <aside style={{ display: "grid", gap: "18px" }}>
          <ProductionInstructionsPanel order={order} />

          <ArtworkPreviewPanel
            artwork={order.artwork_files || []}
          />

          <PrintableProductionTicket ref={printableTicketRef} order={order} />
        </aside>
      </div>
    </div>
  );
}
