export function cleanupProductionLabel(label = "") {
  const normalized = String(label).trim().toLowerCase();

  if (
    normalized.includes("screen") ||
    normalized.includes("print")
  ) {
    return "Screen Printing";
  }

  return "DTF";
}

export function cleanupProductionLabels(items = []) {
  return items.map((item) => ({
    ...item,
    productionLabel: cleanupProductionLabel(
      item.productionLabel || item.decoration_type || item.production_type
    ),
  }));
}
