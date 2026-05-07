export function buildMultiPlacementLayout(order = {}) {
  const placements = order.placements || [];

  return placements.map((placement, index) => ({
    id: placement.id || `placement-${index}`,
    name: placement.name || "Placement",
    productionType:
      placement.production_type ||
      placement.decoration_type ||
      "Screen Printing",
    colors: placement.colors || [],
    notes: placement.notes || "",
    qty: placement.qty || order.qty || 0,
  }));
}
