export const OPERATIONAL_ORDER_STATUSES = [
  "New",
  "Awaiting Production",
  "In Production",
  "Ready for Pickup",
  "Picked Up",
  "Completed",
  "Canceled",
];

const ACTIVE_OPERATIONAL_STATUSES = new Set(
  OPERATIONAL_ORDER_STATUSES.filter((status) => !["Completed", "Canceled"].includes(status))
);
const TERMINAL_OPERATIONAL_STATUSES = new Set(["Completed", "Canceled"]);

const STATUS_ALIASES = {
  submitted: "New",
  paid: "New",
  approved: "Awaiting Production",
  "ready for production": "Awaiting Production",
  "awaiting artwork": "New",
  "awaiting deposit": "New",
  "awaiting approval": "New",
  "mockup sent": "New",
  printing: "In Production",
};

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeOperationalStatus(status) {
  const trimmed = String(status || "").trim();
  if (!trimmed) return "New";

  const alias = STATUS_ALIASES[normalize(trimmed)];
  return alias || trimmed;
}

export function getOperationalStatusIndex(status) {
  return OPERATIONAL_ORDER_STATUSES.indexOf(normalizeOperationalStatus(status));
}

export function isCompletedOperationalStatus(status) {
  return normalizeOperationalStatus(status) === "Completed";
}

export function isCanceledOperationalStatus(status) {
  return normalizeOperationalStatus(status) === "Canceled";
}

export function isActiveOperationalStatus(status) {
  const normalizedStatus = normalizeOperationalStatus(status);
  return ACTIVE_OPERATIONAL_STATUSES.has(normalizedStatus);
}

export function isReadyForProductionStatus(status) {
  return ["Awaiting Production", "In Production", "Ready for Pickup", "Picked Up", "Completed"].includes(
    normalizeOperationalStatus(status)
  );
}

export function canAdvanceOperationalStatus(status) {
  const normalizedStatus = normalizeOperationalStatus(status);
  if (TERMINAL_OPERATIONAL_STATUSES.has(normalizedStatus)) return false;

  const index = getOperationalStatusIndex(normalizedStatus);
  return index >= 0 && index < OPERATIONAL_ORDER_STATUSES.length - 1;
}

export function getNextOperationalStatus(status) {
  const normalizedStatus = normalizeOperationalStatus(status);
  if (TERMINAL_OPERATIONAL_STATUSES.has(normalizedStatus)) return normalizedStatus;

  const index = getOperationalStatusIndex(normalizedStatus);
  if (index < 0) return "Awaiting Production";
  return OPERATIONAL_ORDER_STATUSES[Math.min(index + 1, OPERATIONAL_ORDER_STATUSES.length - 1)];
}

export function sortOrdersByOperationalStatus(orders = []) {
  return [...orders].sort((left, right) => {
    const leftIndex = getOperationalStatusIndex(left.status);
    const rightIndex = getOperationalStatusIndex(right.status);

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return String(left.due_date || "9999-12-31").localeCompare(
      String(right.due_date || "9999-12-31")
    );
  });
}
