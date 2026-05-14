import { useSyncExternalStore } from "react";
import { demoOrders } from "../data/demoOrders";
import { normalizeProductionType } from "../constants/productionTypes";
import {
  isActiveOperationalStatus,
  isReadyForProductionStatus,
  normalizeOperationalStatus,
} from "../orders/orderWorkflow";
import { normalizeOrderFinancials } from "../orders/orderFinancials";
import {
  isQuoteReadyForProduction,
  normalizeQuoteStatus,
} from "../quotes/quoteWorkflow";
import { validatePaymentAmount } from "./financialValidation";
import { buildStaffAuditFields, getActiveStaffUser } from "./staffUsersStore";
import { getRawStorageItem, hasBrowserStorage, setRawStorageItem } from "./browserStorage";
import { formatShortDate, toIsoTimestamp } from "./dateFormatting";
import { getArtworkDisplayName, getOrderArtworkFiles } from "./orderArtwork";

const STORAGE_KEY = "teeCoStaffOrders";
const orderListeners = new Set();
const EMPTY_ORDERS = [];

let cachedOrdersRaw = null;
let cachedOrdersSnapshot = EMPTY_ORDERS;

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function normalizePlacements(order = {}) {
  if (Array.isArray(order.placements) && order.placements.length) {
    return order.placements.filter((placement) => placement?.placement);
  }

  if (order.placement) {
    return [
      {
        placement: order.placement,
        decoration_type: order.decoration_type || order.production_type || "",
        artwork_id: order.customer_artwork_id || "",
        artwork_name: order.customer_artwork_name || "",
      },
    ];
  }

  return [];
}

function resolveFirstTimestamp(candidates = [], fallbackTimestamp = new Date().toISOString()) {
  for (const candidate of candidates) {
    const resolvedValue = toIsoTimestamp(candidate);
    if (resolvedValue) return resolvedValue;
  }

  return fallbackTimestamp;
}

function resolveLatestTimestamp(candidates = [], fallbackTimestamp = new Date().toISOString()) {
  const timestamps = candidates
    .map((candidate) => toIsoTimestamp(candidate))
    .filter(Boolean);

  if (!timestamps.length) {
    return fallbackTimestamp;
  }

  return timestamps.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
}

function normalizeOrderTimestamps(order = {}) {
  const fallbackTimestamp = new Date().toISOString();
  const paymentTimestamps = Array.isArray(order.payment_history)
    ? order.payment_history.flatMap((payment) => [
        payment?.timestamp,
        payment?.created_at,
        payment?.recorded_at,
      ])
    : [];
  const activityTimestamps = Array.isArray(order.activity_log)
    ? order.activity_log.map((event) => event?.created_at)
    : [];
  const createdAt = resolveFirstTimestamp(
    [
      order.created_at,
      order.date,
      order.submitted_at,
      order.approval_sent_at,
      order.approved_at,
      order.customer_approved_at,
      order.production_started_at,
      order.canceled_at,
      order.quote_canceled_at,
      ...activityTimestamps,
      ...paymentTimestamps,
      order.updated_at,
    ],
    fallbackTimestamp
  );
  const updatedAt = resolveLatestTimestamp(
    [
      order.updated_at,
      order.completed_at,
      order.picked_up_at,
      order.canceled_at,
      order.quote_canceled_at,
      order.production_started_at,
      order.approved_at,
      order.customer_approved_at,
      order.customer_revision_requested_at,
      order.revision_requested_at,
      order.approval_sent_at,
      ...activityTimestamps,
      ...paymentTimestamps,
      createdAt,
    ],
    createdAt
  );

  return {
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function normalizeStoredOrder(order = {}) {
  const assignedToStaffId = order.assigned_to_staff_id || "";
  const assignedToStaffName = order.assigned_to_staff_name || "";
  const hasAssignedStaff = Boolean(assignedToStaffId);
  const status = normalizeOperationalStatus(order.status || "New");
  const quoteStatus = normalizeQuoteStatus(
    order.quote_status || (order.operational_visible === false ? "Draft" : "Ready For Production")
  );
  const artworkFiles = getOrderArtworkFiles(order);
  const placements = normalizePlacements(order);
  const primaryPlacement = placements[0] || null;
  const primaryArtwork = artworkFiles[0] || null;
  const timestamps = normalizeOrderTimestamps(order);

  return normalizeOrderFinancials({
    ...order,
    ...timestamps,
    date: order.date || formatShortDate(timestamps.created_at),
    status,
    quote_status: quoteStatus,
    placements,
    artwork_files: artworkFiles,
    artwork_reference_names: artworkFiles.map((file) => getArtworkDisplayName(file)),
    placement: order.placement || primaryPlacement?.placement || "",
    decoration_type: normalizeProductionType(
      order.decoration_type || order.production_type || ""
    ),
    customer_artwork_id:
      order.customer_artwork_id || primaryArtwork?.id || primaryPlacement?.artwork_id || "",
    customer_artwork_name:
      order.customer_artwork_name ||
      (primaryArtwork ? getArtworkDisplayName(primaryArtwork) : "") ||
      primaryPlacement?.artwork_name ||
      "",
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
        : isQuoteReadyForProduction(quoteStatus) && isReadyForProductionStatus(status),
    operational_visible:
      typeof order.operational_visible === "boolean"
        ? order.operational_visible
        : isQuoteReadyForProduction(quoteStatus) && isActiveOperationalStatus(status),
  });
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
    date: order.date || formatShortDate(order.created_at || createdAt),
    created_at: order.created_at || createdAt,
    updated_at: order.updated_at || order.created_at || createdAt,
    activity_log: order.activity_log || [],
  });
}

function readStoredOrders() {
  if (!hasBrowserStorage()) return [];

  try {
    const rawOrders = getRawStorageItem(STORAGE_KEY);
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
  const nextStatus = normalizeOperationalStatus(
    updates.status || currentOrder.status
  );

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
    status: nextStatus,
    production_ready:
      Object.prototype.hasOwnProperty.call(updates, "production_ready")
        ? updates.production_ready
        : isReadyForProductionStatus(nextStatus),
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

function buildWorkflowDerivedUpdates(currentOrder, updates) {
  const nextStatus = normalizeOperationalStatus(updates.status || currentOrder.status);
  const nextQuoteStatus = normalizeQuoteStatus(
    updates.quote_status || currentOrder.quote_status
  );
  const shouldDeriveStatus = Object.prototype.hasOwnProperty.call(updates, "status");
  const isCanceled =
    nextStatus === "Canceled" || nextQuoteStatus === "Canceled";
  const isArchived = Object.prototype.hasOwnProperty.call(updates, "quote_archived")
    ? updates.quote_archived === true
    : currentOrder.quote_archived === true;

  return {
    ...updates,
    status: isCanceled ? "Canceled" : nextStatus,
    quote_status: isCanceled ? "Canceled" : nextQuoteStatus,
    production_ready: shouldDeriveStatus
      ? isCanceled
        ? false
        : isReadyForProductionStatus(nextStatus)
      : Object.prototype.hasOwnProperty.call(updates, "production_ready")
      ? updates.production_ready
      : currentOrder.production_ready,
    operational_visible: shouldDeriveStatus
      ? isCanceled
        ? false
        : isActiveOperationalStatus(nextStatus)
      : Object.prototype.hasOwnProperty.call(updates, "operational_visible")
      ? updates.operational_visible
      : currentOrder.operational_visible,
    quote_archived: isArchived,
    quote_archived_at:
      Object.prototype.hasOwnProperty.call(updates, "quote_archived_at")
        ? updates.quote_archived_at
        : isArchived
        ? currentOrder.quote_archived_at || new Date().toISOString()
        : null,
  };
}

function describeOrderUpdate(updates) {
  if (updates.activity_note) return updates.activity_note;
  if (updates.quote_archived === true) return "Quote archived from active workflow.";
  if (updates.quote_archived === false) return "Quote restored to active workflow.";
  if (updates.status === "Canceled" || updates.quote_status === "Canceled") {
    return "Workflow canceled while preserving operational and financial history.";
  }
  if (updates.status) return `Status changed to ${updates.status}.`;
  if (updates.pickup_status === "Picked Up") return "Order marked as picked up.";
  if (updates.pickup_status === "Ready for Pickup") return "Order marked ready for pickup.";
  if (updates.payment_history) return "Payment recorded.";
  if (updates.deposit?.status === "paid") return "Deposit recorded as paid.";
  if (updates.deposit?.status === "pending") return "Deposit requested.";
  if (updates.quote_status) return `Quote status changed to ${updates.quote_status}.`;
  if (updates.artwork_files) return "Artwork file uploaded.";
  if (updates.size_breakdown) return "Size breakdown updated.";
  if (updates.quote) return "Quote snapshot saved.";
  if (updates.approval_note) return "Approval note updated.";
  return "Order updated.";
}

function describeActivityType(updates) {
  if (updates.activity_type) return updates.activity_type;
  if (Object.prototype.hasOwnProperty.call(updates, "quote_archived")) return "quote_archive";
  if (updates.status === "Canceled" || updates.quote_status === "Canceled") return "canceled";
  if (updates.status) return "status_change";
  if (updates.pickup_status) return "pickup";
  if (updates.payment_history) return "payment";
  if (updates.deposit) return "deposit";
  if (updates.quote_status) return "quote_status";
  if (updates.artwork_files) return "artwork";
  if (updates.size_breakdown) return "sizes";
  if (updates.quote) return "quote";
  if (updates.approval_note) return "approval_note";
  return "updated";
}

function stripActivityMeta(updates) {
  const { activity_note: _ACTIVITY_NOTE, activity_type: _ACTIVITY_TYPE, ...cleanUpdates } =
    updates;
  return cleanUpdates;
}

function buildPaymentValidationError(validation) {
  const error = new Error(validation.message || "Invalid payment amount.");
  error.code = validation.code || "INVALID_AMOUNT";
  return error;
}

export function getStoredOrders() {
  return readStoredOrders();
}

export function saveStoredOrders(orders) {
  if (!hasBrowserStorage()) return false;

  const normalizedOrders = Array.isArray(orders)
    ? orders.map((order) => normalizeStoredOrder(order))
    : [];

  const saved = setRawStorageItem(STORAGE_KEY, JSON.stringify(normalizedOrders));
  if (!saved) {
    return false;
  }

  emitOrdersUpdated();
  return true;
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

  if (!saveStoredOrders(nextOrders)) {
    throw new Error("Unable to seed stored orders.");
  }
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
    status: normalizeOperationalStatus(orderInput.status || "New"),
    date: formatShortDate(createdAt),
    created_at: createdAt,
    updated_at: createdAt,
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
  if (!saveStoredOrders(nextOrders)) {
    throw new Error("Unable to save order. Browser storage write failed.");
  }
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
      buildWorkflowDerivedUpdates(order, buildAssignmentUpdates(order, updates))
    );

    updatedOrder = normalizeStoredOrder({
      ...order,
      ...cleanUpdates,
      ...buildStaffAuditFields("updated"),
      created_at: order.created_at,
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

  if (!saveStoredOrders(nextOrders)) {
    throw new Error("Unable to update order. Browser storage write failed.");
  }
  return updatedOrder;
}

export function recordStoredOrderPayment(orderNumber, paymentInput = {}, options = {}) {
  const order = findStoredOrder(orderNumber);
  if (!order) return null;

  const financialOptions = options.financialOptions || {};
  const activeStaff = options.staffUser || getActiveStaffUser();
  const normalizedOrder = normalizeOrderFinancials(order, financialOptions);
  const validation = validatePaymentAmount({
    amount: paymentInput.amount,
    remainingBalance: normalizedOrder.balance_due,
  });

  if (!validation.valid) {
    throw buildPaymentValidationError(validation);
  }

  const paymentEntry = {
    id: `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    amount: Number(paymentInput.amount) || 0,
    method: paymentInput.method || "Other",
    timestamp: new Date().toISOString(),
    staff_member: activeStaff?.name || "Unknown Staff",
    note: String(paymentInput.note || "").trim(),
  };
  const paymentHistory = [paymentEntry, ...(order.payment_history || [])];
  const nextFinancials = normalizeOrderFinancials(
    {
      ...order,
      payment_history: paymentHistory,
    },
    financialOptions
  );
  const paymentNote = paymentEntry.note ? ` Note: ${paymentEntry.note}` : "";
  const statusNote =
    nextFinancials.payment_status === "Paid"
      ? " Order is now paid in full."
      : ` Remaining balance: ${money(nextFinancials.balance_due)}.`;

  return updateStoredOrder(orderNumber, {
    payment_history: paymentHistory,
    activity_type: "payment",
    activity_note: `Recorded payment of ${money(paymentEntry.amount)} via ${paymentEntry.method}.${paymentNote}${statusNote}`,
  });
}

export function duplicateStoredOrder(orderNumber) {
  const original = findStoredOrder(orderNumber);
  if (!original) return null;

  const copiedOrder = {
    ...original,
    status: "New",
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
