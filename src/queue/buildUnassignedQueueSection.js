import { getUnassignedOrders } from "./assignmentVisibility";

export function buildUnassignedQueueSection(orders = []) {
  const unassignedOrders = getUnassignedOrders(orders);

  return {
    title: "Unassigned",
    count: unassignedOrders.length,
    orders: unassignedOrders,
    hasItems: unassignedOrders.length > 0,
  };
}
