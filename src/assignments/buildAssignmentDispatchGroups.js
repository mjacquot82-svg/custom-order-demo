import { sortOrdersByOperationalStatus } from "../orders/orderWorkflow";
import { buildQueuePriority, sortQueueByPriority } from "../queue/buildQueuePriority";

export function buildAssignmentDispatchGroups(orders = []) {
  const grouped = {};

  orders.forEach((order) => {
    const worker = order.assigned_to_staff_name || "Unassigned";

    if (!grouped[worker]) {
      grouped[worker] = [];
    }

    grouped[worker].push(order);
  });

  return Object.entries(grouped)
    .map(([workerName, workerOrders]) => {
      const overdueCount = workerOrders.filter((order) => buildQueuePriority(order).overdue).length;

      return {
        workerName,
        overdueCount,
        orderCount: workerOrders.length,
        orders: sortQueueByPriority(sortOrdersByOperationalStatus(workerOrders)),
      };
    })
    .sort((left, right) => {
      if (right.overdueCount !== left.overdueCount) {
        return right.overdueCount - left.overdueCount;
      }

      if (right.orderCount !== left.orderCount) {
        return right.orderCount - left.orderCount;
      }

      return left.workerName.localeCompare(right.workerName);
    });
}
