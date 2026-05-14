export const QUOTE_STATUSES = [
  "Draft",
  "Sent",
  "Awaiting Approval",
  "Awaiting Artwork Approval",
  "Awaiting Deposit",
  "Approved",
  "Ready For Production",
  "Canceled",
];

const QUOTE_STATUS_ALIASES = {
  submitted: "Sent",
  "artwork approval": "Awaiting Artwork Approval",
  "awaiting artwork": "Awaiting Artwork Approval",
  "awaiting customer approval": "Awaiting Approval",
  "deposit requested": "Awaiting Deposit",
  paid: "Approved",
  approved: "Approved",
  "ready for production": "Ready For Production",
};

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeQuoteStatus(status) {
  const trimmed = String(status || "").trim();
  if (!trimmed) return "Draft";

  return QUOTE_STATUS_ALIASES[normalize(trimmed)] || trimmed;
}

export function getQuoteStatusIndex(status) {
  return QUOTE_STATUSES.indexOf(normalizeQuoteStatus(status));
}

export function canAdvanceQuoteStatus(status) {
  const normalizedStatus = normalizeQuoteStatus(status);
  if (normalizedStatus === "Canceled") return false;

  const index = getQuoteStatusIndex(normalizedStatus);
  return index >= 0 && index < QUOTE_STATUSES.length - 1;
}

export function getNextQuoteStatus(status) {
  const normalizedStatus = normalizeQuoteStatus(status);
  if (normalizedStatus === "Canceled") return "Canceled";

  const index = getQuoteStatusIndex(normalizedStatus);
  if (index < 0) return "Sent";

  return QUOTE_STATUSES[Math.min(index + 1, QUOTE_STATUSES.length - 1)];
}

export function isQuoteReadyForProduction(status) {
  return normalizeQuoteStatus(status) === "Ready For Production";
}

export function isQuoteArchived(order) {
  return order?.quote_archived === true;
}

export function isQuoteCanceled(order) {
  return normalizeQuoteStatus(order?.quote_status || order?.status) === "Canceled";
}

export function isActiveQuoteWorkflowOrder(order) {
  return order?.operational_visible !== true && !isQuoteArchived(order) && !isQuoteCanceled(order);
}

export function sortQuotesByStatus(quotes = []) {
  return [...quotes].sort((left, right) => {
    const leftIndex = getQuoteStatusIndex(left.quote_status);
    const rightIndex = getQuoteStatusIndex(right.quote_status);

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return String(right.updated_at || "").localeCompare(String(left.updated_at || ""));
  });
}
