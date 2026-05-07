export function buildQueueWorkerSummary(sections = []) {
  return sections.map((section) => ({
    workerName: section.workerName || "Unassigned",
    totalOrders: Number(section.orderCount || 0),
    hasOrders: Number(section.orderCount || 0) > 0,
  }));
}
