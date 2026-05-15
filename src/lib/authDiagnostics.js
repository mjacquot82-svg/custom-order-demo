const AUTH_DIAGNOSTICS_KEY = "__TEE_CO_AUTH_DIAGNOSTICS__";

export function pushAuthDiagnostic(event, details = {}) {
  if (typeof window === "undefined") return null;

  const nextEntry = {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  };

  const currentLog = Array.isArray(window[AUTH_DIAGNOSTICS_KEY])
    ? window[AUTH_DIAGNOSTICS_KEY]
    : [];
  const nextLog = [...currentLog.slice(-49), nextEntry];

  window[AUTH_DIAGNOSTICS_KEY] = nextLog;
  console.info("[auth]", nextEntry);
  return nextEntry;
}
