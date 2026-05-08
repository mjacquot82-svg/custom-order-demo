import {
  isCompletedOperationalStatus,
  sortOrdersByOperationalStatus,
} from "../orders/orderWorkflow";

export function buildAssignmentDispatchGroups(orders = []) {
  const grouped = {};

  orders.forEach((order) => {
    const worker = order.assigned_to_staff_name || "Unassigned";

    if (!grouped[worker]) {
      grouped[worker] = [];
    }

    grouped[worker].push(order);
  });

  return Object.entries(grouped).map(([workerName, workerOrders]) => {
    const overdueCount = workerOrders.filter((order) => {
      if (!order.due_date) return false;

      const dueDate = new Date(`${order.due_date}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return dueDate < today && !isCompletedOperationalStatus(order.status);
    }).length;

    return {
      workerName,
      overdueCount,
      orderCount: workerOrders.length,
      orders: sortOrdersByOperationalStatus(workerOrders),
    };
  });
}
