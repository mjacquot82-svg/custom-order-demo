import { buildAssignmentQueueGroups } from "./assignmentVisibility";

export function buildWorkerQueueSections(orders = []) {
  const groups = buildAssignmentQueueGroups(orders);

  return Object.entries(groups).map(([workerName, workerOrders]) => ({
    workerName,
    orderCount: workerOrders.length,
    orders: workerOrders,
  }));
}
