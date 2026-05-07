import { getUnassignedOrders } from "./assignmentVisibility";

export function buildUnassignedQueueSection(orders = []) {
  const unassignedOrders = getUnassignedOrders(orders);

  return {
    title: "Needs Assignment",
    count: unassignedOrders.length,
    orders: unassignedOrders,
    hasItems: unassignedOrders.length > 0,
  };
}
