function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildOperationalMetrics(orders = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let overdue = 0;
  let dueToday = 0;
  let activeProduction = 0;
  let readyForPickup = 0;
  let needsAssignment = 0;

  const productionTypes = {};
  const workerLoad = {};

  orders.forEach((order) => {
    const status = normalize(order.status);

    if (order.due_date) {
      const dueDate = new Date(`${order.due_date}T00:00:00`);

      if (dueDate < today && status !== "completed") {
        overdue += 1;
      }

      if (dueDate.getTime() === today.getTime()) {
        dueToday += 1;
      }
    }

    if (["in production", "printing", "ready for production"].includes(status)) {
      activeProduction += 1;
    }

    if (status === "ready for pickup") {
      readyForPickup += 1;
    }

    if (order.needs_assignment || !order.assigned_to_staff_name) {
      needsAssignment += 1;
    }

    const productionType = order.decoration_type || "Screen Printing";
    productionTypes[productionType] = (productionTypes[productionType] || 0) + 1;

    const worker = order.assigned_to_staff_name || "Unassigned";
    workerLoad[worker] = (workerLoad[worker] || 0) + 1;
  });

  return {
    overdue,
    dueToday,
    activeProduction,
    readyForPickup,
    needsAssignment,
    productionTypes,
    workerLoad,
  };
}
