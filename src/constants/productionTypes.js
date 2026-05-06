export const PRODUCTION_TYPES = [
  "Screen Printing",
  "DTF",
];

export function normalizeProductionType(value = "") {
  const normalized = String(value).trim().toLowerCase();

  if (
    normalized.includes("screen") ||
    normalized.includes("print")
  ) {
    return "Screen Printing";
  }

  if (normalized.includes("dtf")) {
    return "DTF";
  }

  return "Screen Printing";
}
