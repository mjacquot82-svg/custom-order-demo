import { useParams, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { findStoredOrder, updateStoredOrder } from "../lib/ordersStore";
import { getStoredProducts } from "../lib/productsStore";
import { getActiveStaffUser, getActiveStaffUsers } from "../lib/staffUsersStore";
import { generateQuoteSnapshot } from "../lib/quoteEngine";
import StatusBadge from "../components/StatusBadge";
import ProductionProgressTracker from "../order-detail/ProductionProgressTracker";
import AssignmentPanel from "../order-detail/AssignmentPanel";
import ActivityTimeline from "../order-detail/ActivityTimeline";
import ProductionInstructionsPanel from "../order-detail/ProductionInstructionsPanel";
import ArtworkPreviewPanel from "../order-detail/ArtworkPreviewPanel";
import PrintableProductionTicket from "../order-detail/PrintableProductionTicket";
import { buildOrderUrgency } from "../order-detail/buildOrderUrgency";

const cardStyle = {
  background: "#ffffff",
  borderRadius: "20px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const inputStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  padding: "11px",
  boxSizing: "border-box",
};

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function OrderDetail() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [staffUsers, setStaffUsers] = useState([]);

  useEffect(() => {
    const stored = findStoredOrder(orderNumber);
    if (!stored) return;

    setOrder(stored);
    setStaffUsers(getActiveStaffUsers());
  }, [orderNumber]);

  const selectedProduct = useMemo(() => {
    if (!order) return null;

    return getStoredProducts().find(
      (product) =>
        product.id === order.product_id ||
        product.name === order.garment
    );
  }, [order]);

  const quoteSnapshot = useMemo(() => {
    if (!order) return null;
    return generateQuoteSnapshot(order, selectedProduct);
  }, [order, selectedProduct]);

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

    if (updated) {
      setOrder(updated);
    }
  }

  function handleAssign(staffId) {
    const worker = staffUsers.find((staff) => staff.id === staffId);

    saveOrderUpdates({
      assigned_to_staff_id: worker?.id || "",
      assigned_to_staff_name: worker?.name || "",
      assigned_to_staff_role: worker?.role || "",
      assigned_at: worker ? new Date().toISOString() : null,
      needs_assignment: !worker,
    });
  }

  function handleStartProduction() {
    saveOrderUpdates({
      status: "In Production",
      production_ready: true,
      production_started_at: new Date().toISOString(),
    });
  }

  function handlePauseProduction() {
    saveOrderUpdates({
      status: "On Hold",
    });
  }

  function handleCompleteProduction() {
    saveOrderUpdates({
      status: "Completed",
      completed_at: new Date().toISOString(),
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
            onClick={() => window.print()}
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
            onStart={handleStartProduction}
            onPause={handlePauseProduction}
            onComplete={handleCompleteProduction}
          />

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Quote Snapshot</h2>

            {quoteSnapshot ? (
              <div style={{ display: "grid", gap: "8px" }}>
                <span>
                  <strong>Quantity:</strong>
                  {quoteSnapshot.quantity || order.qty || 0}
                </span>

                <span>
                  <strong>Placement Subtotal:</strong>
                  {money(quoteSnapshot.placement_subtotal)}
                </span>

                <span>
                  <strong>Setup Fees:</strong>
                  {money(quoteSnapshot.setup_subtotal)}
                </span>

                <span style={{ fontSize: "20px" }}>
                  <strong>Total:</strong>
                  {money(quoteSnapshot.total)}
                </span>
              </div>
            ) : (
              <p style={{ color: "#94a3b8" }}>
                Quote snapshot unavailable.
              </p>
            )}
          </section>

          <ActivityTimeline
            events={order.activity_log || []}
          />
        </div>

        <aside style={{ display: "grid", gap: "18px" }}>
          <ProductionInstructionsPanel order={order} />

          <ArtworkPreviewPanel
            artwork={order.artwork_files || []}
          />

          <PrintableProductionTicket order={order} />
        </aside>
      </div>
    </div>
  );
}
