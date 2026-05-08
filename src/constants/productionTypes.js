export const PRODUCTION_TYPES = [
  "Screen Print",
  "DTF",
  "Embroidery",
];

export function normalizeProductionType(value = "") {
  const normalized = String(value).trim().toLowerCase();

  if (
    normalized.includes("screen") ||
    normalized.includes("print")
  ) {
    return "Screen Print";
  }

  if (normalized.includes("dtf")) {
    return "DTF";
  }

  if (normalized.includes("embroider")) {
    return "Embroidery";
  }

  return "Screen Print";
}
