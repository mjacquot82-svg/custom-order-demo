export function buildAssignmentQueueGroups(orders = []) {
  const grouped = {};

  orders.forEach((order) => {
    const assignedTo = order.assigned_to_staff_name || "Unassigned";

    if (!grouped[assignedTo]) {
      grouped[assignedTo] = [];
    }

    grouped[assignedTo].push(order);
  });

  return grouped;
}

export function getUnassignedOrders(orders = []) {
  return orders.filter(
    (order) => !order.assigned_to_staff_id || order.needs_assignment
  );
}
