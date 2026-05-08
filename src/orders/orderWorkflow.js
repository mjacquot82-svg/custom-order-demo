export const OPERATIONAL_ORDER_STATUSES = [
  "New",
  "Awaiting Production",
  "In Production",
  "Ready for Pickup",
  "Picked Up",
  "Completed",
];

const ACTIVE_OPERATIONAL_STATUSES = new Set(
  OPERATIONAL_ORDER_STATUSES.filter((status) => status !== "Completed")
);

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

export function isActiveOperationalStatus(status) {
  return ACTIVE_OPERATIONAL_STATUSES.has(normalizeOperationalStatus(status));
}

export function isReadyForProductionStatus(status) {
  return ["Awaiting Production", "In Production", "Ready for Pickup", "Picked Up", "Completed"].includes(
    normalizeOperationalStatus(status)
  );
}

export function canAdvanceOperationalStatus(status) {
  const index = getOperationalStatusIndex(status);
  return index >= 0 && index < OPERATIONAL_ORDER_STATUSES.length - 1;
}

export function getNextOperationalStatus(status) {
  const index = getOperationalStatusIndex(status);
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
