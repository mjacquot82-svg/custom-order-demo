import {
  getJsonStorageItem,
  hasBrowserStorage,
  removeStorageItem,
  setJsonStorageItem,
} from "./browserStorage";
import { pushAuthDiagnostic } from "./authDiagnostics";

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
    pushAuthDiagnostic("customer-session-hydrated", {
      hydrationResult: "empty",
    });
    return null;
  }

  const hydratedSession = normalizeCustomerSession(storedSession);
  pushAuthDiagnostic("customer-session-hydrated", {
    hydrationResult: "restored",
    email: hydratedSession.email,
    displayName: hydratedSession.displayName,
  });

  return hydratedSession;
}

export function setActiveCustomerSession(session, options = {}) {
  if (!hasBrowserStorage()) return null;
  const nextSession = normalizeCustomerSession(session);
  setJsonStorageItem(STORAGE_KEY, nextSession, { storage: "session" });
  emitCustomerSessionUpdated();
  pushAuthDiagnostic("customer-session-created", {
    email: nextSession.email,
    displayName: nextSession.displayName,
    source: options.source || "unknown",
  });
  return nextSession;
}

export function clearActiveCustomerSession(options = {}) {
  if (!hasBrowserStorage()) return;
  const previousSession = getJsonStorageItem(STORAGE_KEY, null, { storage: "session" });
  removeStorageItem(STORAGE_KEY, { storage: "session" });
  emitCustomerSessionUpdated();
  pushAuthDiagnostic("customer-session-cleared", {
    reason: options.reason || "manual-clear",
    hadSession: Boolean(previousSession),
    previousEmail: previousSession?.email || "",
  });
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
