import {
  getJsonStorageItem,
  hasBrowserStorage,
  removeStorageItem,
  setJsonStorageItem,
} from "./browserStorage";

const STORAGE_KEY = "teeCoActiveCustomerSession";
const CUSTOMER_SESSION_UPDATED_EVENT = "tee-co-customer-session-updated";

function emitCustomerSessionUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CUSTOMER_SESSION_UPDATED_EVENT));
}

function normalizeCustomerSession(session = {}) {
  const firstName = String(session.firstName || "").trim();
  const lastName = String(session.lastName || "").trim();
  const email = String(session.email || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const displayName = fullName || firstName || email || "Customer Account";

  return {
    firstName,
    lastName,
    email,
    displayName,
  };
}

export function getActiveCustomerSession() {
  if (!hasBrowserStorage()) return null;

  const storedSession = getJsonStorageItem(STORAGE_KEY, null, { storage: "session" });
  if (!storedSession || typeof storedSession !== "object") {
    return null;
  }

  return normalizeCustomerSession(storedSession);
}

export function setActiveCustomerSession(session) {
  if (!hasBrowserStorage()) return null;
  const nextSession = normalizeCustomerSession(session);
  setJsonStorageItem(STORAGE_KEY, nextSession, { storage: "session" });
  emitCustomerSessionUpdated();
  return nextSession;
}

export function clearActiveCustomerSession() {
  if (!hasBrowserStorage()) return;
  removeStorageItem(STORAGE_KEY, { storage: "session" });
  emitCustomerSessionUpdated();
}

export function subscribeToActiveCustomerSession(listener) {
  if (typeof window === "undefined") return () => {};

  function handleSessionUpdated() {
    listener(getActiveCustomerSession());
  }

  window.addEventListener(CUSTOMER_SESSION_UPDATED_EVENT, handleSessionUpdated);

  return () => {
    window.removeEventListener(CUSTOMER_SESSION_UPDATED_EVENT, handleSessionUpdated);
  };
}
