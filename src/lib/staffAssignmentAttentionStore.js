import { useSyncExternalStore } from "react";
import { getRawStorageItem, hasBrowserStorage, setRawStorageItem } from "./browserStorage";

const STORAGE_KEY = "teeCoStaffAssignmentAttention";
const attentionListeners = new Set();
const EMPTY_ATTENTION_STATE = Object.freeze({});

let cachedAttentionRaw = null;
let cachedAttentionSnapshot = EMPTY_ATTENTION_STATE;

function normalizeTimestamp(value) {
  const timestamp = new Date(value || "").getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function normalizeAttentionEntry(entry = {}) {
  return {
    staff_id: String(entry.staff_id || "").trim(),
    order_number: String(entry.order_number || "").trim(),
    acknowledged_assignment_at: entry.acknowledged_assignment_at || "",
    acknowledged_at: entry.acknowledged_at || "",
  };
}

function buildAttentionKey(staffId, orderNumber) {
  return `${String(staffId || "").trim()}::${String(orderNumber || "").trim()}`;
}

function emitAssignmentAttentionUpdated() {
  attentionListeners.forEach((listener) => listener());
}

function readStoredAssignmentAttention() {
  if (!hasBrowserStorage()) return EMPTY_ATTENTION_STATE;

  try {
    const rawAttention = getRawStorageItem(STORAGE_KEY);
    const normalizedRawAttention = rawAttention || "";

    if (normalizedRawAttention === cachedAttentionRaw) {
      return cachedAttentionSnapshot;
    }

    const parsedAttention = rawAttention ? JSON.parse(rawAttention) : {};
    const normalizedAttentionState = {};

    Object.entries(parsedAttention || {}).forEach(([key, entry]) => {
      normalizedAttentionState[key] = normalizeAttentionEntry(entry);
    });

    cachedAttentionRaw = normalizedRawAttention;
    cachedAttentionSnapshot = normalizedAttentionState;

    return cachedAttentionSnapshot;
  } catch (error) {
    console.error("Unable to read Tee & Co staff assignment attention", error);
    cachedAttentionRaw = null;
    cachedAttentionSnapshot = EMPTY_ATTENTION_STATE;
    return EMPTY_ATTENTION_STATE;
  }
}

export function getStoredAssignmentAttention() {
  return readStoredAssignmentAttention();
}

export function saveStoredAssignmentAttention(attentionState) {
  if (!hasBrowserStorage()) return false;

  const normalizedAttentionState = {};

  Object.entries(attentionState || {}).forEach(([key, entry]) => {
    normalizedAttentionState[key] = normalizeAttentionEntry(entry);
  });

  const saved = setRawStorageItem(STORAGE_KEY, JSON.stringify(normalizedAttentionState));
  if (!saved) return false;

  emitAssignmentAttentionUpdated();
  return true;
}

export function markAssignmentAttentionSeen({ staffId, orderNumber, assignedAt }) {
  const normalizedStaffId = String(staffId || "").trim();
  const normalizedOrderNumber = String(orderNumber || "").trim();
  const normalizedAssignedAt = String(assignedAt || "").trim();

  if (!normalizedStaffId || !normalizedOrderNumber || !normalizedAssignedAt) {
    return null;
  }

  const attentionState = getStoredAssignmentAttention();
  const key = buildAttentionKey(normalizedStaffId, normalizedOrderNumber);
  const currentEntry = attentionState[key];

  if (
    currentEntry?.acknowledged_assignment_at === normalizedAssignedAt &&
    currentEntry?.staff_id === normalizedStaffId &&
    currentEntry?.order_number === normalizedOrderNumber
  ) {
    return currentEntry;
  }

  const nextEntry = {
    staff_id: normalizedStaffId,
    order_number: normalizedOrderNumber,
    acknowledged_assignment_at: normalizedAssignedAt,
    acknowledged_at: new Date().toISOString(),
  };

  saveStoredAssignmentAttention({
    ...attentionState,
    [key]: nextEntry,
  });

  return nextEntry;
}

export function hasActiveAssignmentAttention(
  { staffId, orderNumber, assignedAt },
  attentionState = getStoredAssignmentAttention()
) {
  const normalizedStaffId = String(staffId || "").trim();
  const normalizedOrderNumber = String(orderNumber || "").trim();
  const assignedTimestamp = normalizeTimestamp(assignedAt);

  if (!normalizedStaffId || !normalizedOrderNumber || !assignedTimestamp) {
    return false;
  }

  const entry =
    attentionState[buildAttentionKey(normalizedStaffId, normalizedOrderNumber)];

  if (!entry?.acknowledged_assignment_at) {
    return true;
  }

  return normalizeTimestamp(entry.acknowledged_assignment_at) < assignedTimestamp;
}

export function subscribeToStaffAssignmentAttention(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  attentionListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      attentionListeners.delete(listener);
    };
  }

  const handleStorage = (event) => {
    if (!event.key || event.key === STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    attentionListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useStaffAssignmentAttention() {
  return useSyncExternalStore(
    subscribeToStaffAssignmentAttention,
    getStoredAssignmentAttention,
    () => EMPTY_ATTENTION_STATE
  );
}
