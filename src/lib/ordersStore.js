import { useSyncExternalStore } from "react";
import { demoOrders } from "../data/demoOrders";
import { normalizeProductionType } from "../constants/productionTypes";
import { buildStaffAuditFields, getActiveStaffUser } from "./staffUsersStore";

const STORAGE_KEY = "teeCoStaffOrders";
const orderListeners = new Set();
const EMPTY_ORDERS = [];

let cachedOrdersRaw = null;
let cachedOrdersSnapshot = EMPTY_ORDERS;

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStoredOrder(order = {}) {
  const assignedToStaffId = order.assigned_to_staff_id || "";
  const assignedToStaffName = order.assigned_to_staff_name || "";
  const hasAssignedStaff = Boolean(assignedToStaffId);
  const status = order.status || "Awaiting Artwork";
  const normalizedStatus = normalizeStatus(status);
  const productionReadyStatuses = [
    "approved",
    "ready for production",
    "in production",
    "printing",
    "ready for pickup",
  ];

  return {
    ...order,
    status,
    decoration_type: normalizeProductionType(
      order.decoration_type || order.production_type || ""
    ),
    assigned_to_staff_id: assignedToStaffId,
    assigned_to_staff_name: assignedToStaffName,
    assigned_to_staff_role: order.assigned_to_staff_role || "",
    needs_assignment:
      typeof order.needs_assignment === "boolean"
        ? order.needs_assignment
        : !hasAssignedStaff,
    production_ready:
      typeof order.production_ready === "boolean"
        ? order.production_ready
        : productionReadyStatuses.includes(normalizedStatus),
    operational_visible:
      typeof order.operational_visible === "boolean"
        ? order.operational_visible
        : normalizedStatus !== "completed",
  };
}

function emitOrdersUpdated() {
  orderListeners.forEach((listener) => listener());
}

function buildSeedOrder(order, index = 0) {
  const createdAt = new Date().toISOString();

  return normalizeStoredOrder({
    ...order,
    order_number: order.order_number || `TC-SEED-${index + 1}`,
    customer_name:
      order.customer_name ||
      ["ABC Construction", "City Hockey", "Local Customer"][index] ||
      "Walk-in Customer",
    garment: order.garment || order.item || "Custom garment",
    qty: Number(order.qty || 0),
    due_date: order.due_date || "",
    source: order.source || "Demo Seed",
    date: order.date || new Date(createdAt).toLocaleDateString(),
    created_at: order.created_at || createdAt,
    activity_log: order.activity_log || [],
  });
}

function readStoredOrders() {
  if (typeof window === "undefined") return [];

  try {
    const rawOrders = window.localStorage.getItem(STORAGE_KEY);
    const normalizedRawOrders = rawOrders || "";

    if (normalizedRawOrders === cachedOrdersRaw) {
      return cachedOrdersSnapshot;
    }

    const parsedOrders = rawOrders ? JSON.parse(rawOrders) : [];

    cachedOrdersRaw = normalizedRawOrders;
    cachedOrdersSnapshot = Array.isArray(parsedOrders)
      ? parsedOrders.map((order) => normalizeStoredOrder(order))
      : EMPTY_ORDERS;

    return cachedOrdersSnapshot;
  } catch (error) {
    console.error("Unable to read stored Tee & Co orders", error);
    cachedOrdersRaw = null;
    cachedOrdersSnapshot = EMPTY_ORDERS;
    return EMPTY_ORDERS;
  }
}

function buildAssignmentUpdates(currentOrder, updates) {
  const hasAssignmentFields =
    Object.prototype.hasOwnProperty.call(updates, "assigned_to_staff_id") ||
    Object.prototype.hasOwnProperty.call(updates, "assigned_to_staff_name") ||
    Object.prototype.hasOwnProperty.call(updates, "assigned_to_staff_role") ||
    Object.prototype.hasOwnProperty.call(updates, "assigned_at") ||
    Object.prototype.hasOwnProperty.call(updates, "needs_assignment");

  if (!hasAssignmentFields) return updates;

  const assignedToStaffId = Object.prototype.hasOwnProperty.call(
    updates,
    "assigned_to_staff_id"
  )
    ? updates.assigned_to_staff_id || ""
    : currentOrder.assigned_to_staff_id || "";
  const assignedToStaffName = Object.prototype.hasOwnProperty.call(
    updates,
    "assigned_to_staff_name"
  )
    ? updates.assigned_to_staff_name || ""
    : currentOrder.assigned_to_staff_name || "";
  const assignedToStaffRole = Object.prototype.hasOwnProperty.call(
    updates,
    "assigned_to_staff_role"
  )
    ? updates.assigned_to_staff_role || ""
    : currentOrder.assigned_to_staff_role || "";
  const assigned = Boolean(assignedToStaffId);
  const nextStatus = normalizeStatus(updates.status || currentOrder.status);
  const shouldAdvanceToReadyForProduction =
    assigned &&
    ["submitted", "paid", "approved"].includes(nextStatus);

  return {
    ...updates,
    assigned_to_staff_id: assignedToStaffId,
    assigned_to_staff_name: assigned ? assignedToStaffName : "",
    assigned_to_staff_role: assigned ? assignedToStaffRole : "",
    assigned_at:
      Object.prototype.hasOwnProperty.call(updates, "assigned_at")
        ? updates.assigned_at
        : assigned
        ? currentOrder.assigned_at || new Date().toISOString()
        : null,
    needs_assignment: assigned ? false : true,
    status: shouldAdvanceToReadyForProduction
      ? "Ready for Production"
      : updates.status || currentOrder.status,
    production_ready:
      shouldAdvanceToReadyForProduction || updates.production_ready || currentOrder.production_ready || false,
  };
}

function buildActivityEvent(type, note, timestamp = new Date().toISOString()) {
  const staff = getActiveStaffUser();

  return {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    note,
    staff_id: staff?.id || "",
    staff_name: staff?.name || "Unknown Staff",
    staff_role: staff?.role || "",
    created_at: timestamp,
  };
}

function describeOrderUpdate(updates) {
  if (updates.activity_note) return updates.activity_note;
  if (updates.status) return `Status changed to ${updates.status}.`;
  if (updates.deposit?.status === "paid") return "Deposit recorded as paid.";
  if (updates.deposit?.status === "pending") return "Deposit requested.";
  if (updates.artwork_files) return "Artwork file uploaded.";
  if (updates.size_breakdown) return "Size breakdown updated.";
  if (updates.quote) return "Quote snapshot saved.";
  if (updates.approval_note) return "Approval note updated.";
  return "Order updated.";
}

function describeActivityType(updates) {
  if (updates.activity_type) return updates.activity_type;
  if (updates.status) return "status_change";
  if (updates.deposit) return "deposit";
  if (updates.artwork_files) return "artwork";
  if (updates.size_breakdown) return "sizes";
  if (updates.quote) return "quote";
  if (updates.approval_note) return "approval_note";
  return "updated";
}

function stripActivityMeta(updates) {
  const { activity_note, activity_type, ...cleanUpdates } = updates;
  return cleanUpdates;
}

export function getStoredOrders() {
  return readStoredOrders();
}

export function saveStoredOrders(orders) {
  if (typeof window === "undefined") return;

  const normalizedOrders = Array.isArray(orders)
    ? orders.map((order) => normalizeStoredOrder(order))
    : [];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedOrders));
  emitOrdersUpdated();
}

export function subscribeToStoredOrders(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  orderListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      orderListeners.delete(listener);
    };
  }

  const handleStorage = (event) => {
    if (!event.key || event.key === STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    orderListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useStoredOrders() {
  return useSyncExternalStore(subscribeToStoredOrders, getStoredOrders, () => EMPTY_ORDERS);
}

export function seedStoredOrders(seedOrders = demoOrders) {
  const currentOrders = getStoredOrders();
  if (currentOrders.length) return currentOrders;

  const nextOrders = (Array.isArray(seedOrders) ? seedOrders : []).map((order, index) =>
    buildSeedOrder(order, index)
  );

  saveStoredOrders(nextOrders);
  return nextOrders;
}

export function createStoredOrder(orderInput) {
  const currentOrders = getStoredOrders();
  const orderNumber = `TC-${Date.now().toString().slice(-6)}`;
  const createdAt = new Date().toISOString();
  const createdAuditFields = buildStaffAuditFields("created");

  const order = {
    ...orderInput,
    ...createdAuditFields,
    order_number: orderNumber,
    status: orderInput.status || "Awaiting Artwork",
    date: new Date(createdAt).toLocaleDateString(),
    created_at: createdAt,
    source: orderInput.source || "Staff Entry",
    activity_log: [
      buildActivityEvent(
        "created",
        `Order created for ${orderInput.customer_name || "Walk-in Customer"}.`,
        createdAt
      ),
    ],
  };

  const nextOrders = [order, ...currentOrders];
  saveStoredOrders(nextOrders);
  return order;
}

export function findStoredOrder(orderNumber) {
  return getStoredOrders().find((order) => order.order_number === orderNumber);
}

export function updateStoredOrder(orderNumber, updates) {
  const currentOrders = getStoredOrders();
  const now = new Date().toISOString();
  let updatedOrder = null;

  const nextOrders = currentOrders.map((order) => {
    if (order.order_number !== orderNumber) return order;

    const cleanUpdates = stripActivityMeta(
      buildAssignmentUpdates(order, updates)
    );

    updatedOrder = normalizeStoredOrder({
      ...order,
      ...cleanUpdates,
      ...buildStaffAuditFields("updated"),
      updated_at: now,
      activity_log: [
        buildActivityEvent(
          describeActivityType(updates),
          describeOrderUpdate(updates),
          now
        ),
        ...(order.activity_log || []),
      ],
    });

    return updatedOrder;
  });

  saveStoredOrders(nextOrders);
  return updatedOrder;
}

export function duplicateStoredOrder(orderNumber) {
  const original = findStoredOrder(orderNumber);
  if (!original) return null;

  const copiedOrder = {
    ...original,
    status: "Awaiting Artwork",
    approval_status: "Not Sent",
    approval_note: "",
    approval_sent_at: null,
    approved_at: null,
    revision_requested_at: null,
    customer_approval_note: "",
    customer_approved_at: null,
    customer_revision_requested_at: null,
    source: "Repeat Order",
    notes: original.notes ? `Repeat order copied from ${original.order_number}. ${original.notes}` : `Repeat order copied from ${original.order_number}.`,
  };

  delete copiedOrder.order_number;
  delete copiedOrder.created_at;
  delete copiedOrder.updated_at;
  delete copiedOrder.date;
  delete copiedOrder.created_by_staff_id;
  delete copiedOrder.created_by_staff_name;
  delete copiedOrder.created_by_staff_role;
  delete copiedOrder.updated_by_staff_id;
  delete copiedOrder.updated_by_staff_name;
  delete copiedOrder.updated_by_staff_role;
  delete copiedOrder.activity_log;

  return createStoredOrder(copiedOrder);
}
