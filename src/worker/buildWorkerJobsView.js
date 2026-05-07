export function buildWorkerJobsView(orders = [], workerName = "") {
  const workerOrders = orders.filter(
    (order) => order.assigned_to_staff_name === workerName
  );

  const grouped = {
    ready: [],
    inProgress: [],
    paused: [],
    completed: [],
  };

  workerOrders.forEach((order) => {
    const status = String(order.status || "").toLowerCase();

    if (["completed", "picked up"].includes(status)) {
      grouped.completed.push(order);
      return;
    }

    if (["on hold", "paused"].includes(status)) {
      grouped.paused.push(order);
      return;
    }

    if (["in production", "printing"].includes(status)) {
      grouped.inProgress.push(order);
      return;
    }

    grouped.ready.push(order);
  });

  return grouped;
}
