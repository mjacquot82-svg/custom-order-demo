import { useSyncExternalStore } from "react";
import { getRawStorageItem, hasBrowserStorage, setRawStorageItem } from "./browserStorage";

const STORAGE_KEY = "demoOperationalEvents";
const MAX_EVENTS = 250;
const eventListeners = new Set();
const EMPTY_EVENTS = [];

let cachedEventsRaw = null;
let cachedEventsSnapshot = EMPTY_EVENTS;

function normalizeEvent(event = {}) {
  return {
    id: event.id || `ops-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    event_type: String(event.event_type || "operational_update").trim() || "operational_update",
    workflow_label: String(event.workflow_label || "Operations").trim() || "Operations",
    reference_type: String(event.reference_type || "order").trim() || "order",
    reference_id: String(event.reference_id || "").trim(),
    reference_label: String(event.reference_label || "Operational record").trim() || "Operational record",
    reference_path: String(event.reference_path || "").trim(),
    summary: String(event.summary || "Operational activity recorded.").trim() || "Operational activity recorded.",
    staff_id: String(event.staff_id || "").trim(),
    staff_name: String(event.staff_name || "Unknown Staff").trim() || "Unknown Staff",
    staff_role: String(event.staff_role || "").trim(),
    created_at: event.created_at || new Date().toISOString(),
  };
}

function emitOperationalEventsUpdated() {
  eventListeners.forEach((listener) => listener());
}

function readStoredOperationalEvents() {
  if (!hasBrowserStorage()) return EMPTY_EVENTS;

  try {
    const rawEvents = getRawStorageItem(STORAGE_KEY);
    const normalizedRawEvents = rawEvents || "";

    if (normalizedRawEvents === cachedEventsRaw) {
      return cachedEventsSnapshot;
    }

    const parsedEvents = rawEvents ? JSON.parse(rawEvents) : [];

    cachedEventsRaw = normalizedRawEvents;
    cachedEventsSnapshot = Array.isArray(parsedEvents)
      ? parsedEvents.map((event) => normalizeEvent(event))
      : EMPTY_EVENTS;

    return cachedEventsSnapshot;
  } catch (error) {
    console.error("Unable to read demo operational events", error);
    cachedEventsRaw = null;
    cachedEventsSnapshot = EMPTY_EVENTS;
    return EMPTY_EVENTS;
  }
}

export function listOperationalEvents() {
  return readStoredOperationalEvents();
}

export function saveOperationalEvents(events) {
  if (!hasBrowserStorage()) return false;

  const normalizedEvents = (Array.isArray(events) ? events : [])
    .map((event) => normalizeEvent(event))
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, MAX_EVENTS);

  const saved = setRawStorageItem(STORAGE_KEY, JSON.stringify(normalizedEvents));
  if (!saved) return false;

  emitOperationalEventsUpdated();
  return true;
}

export function createOperationalEvent(eventInput) {
  const currentEvents = listOperationalEvents();
  const nextEvent = normalizeEvent(eventInput);

  if (!saveOperationalEvents([nextEvent, ...currentEvents])) {
    throw new Error("Unable to save operational event. Browser storage write failed.");
  }

  return nextEvent;
}

export function subscribeToOperationalEvents(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  eventListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      eventListeners.delete(listener);
    };
  }

  const handleStorage = (event) => {
    if (!event.key || event.key === STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    eventListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useOperationalEvents() {
  return useSyncExternalStore(
    subscribeToOperationalEvents,
    listOperationalEvents,
    () => EMPTY_EVENTS
  );
}
