import {
  normalizeProductionType,
  PRODUCTION_TYPES,
} from "../constants/productionTypes";
import {
  isCompletedOperationalStatus,
  normalizeOperationalStatus,
} from "../orders/orderWorkflow";

export function buildOperationalMetrics(orders = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let overdue = 0;
  let dueToday = 0;
  let activeProduction = 0;
  let readyForPickup = 0;
  let needsAssignment = 0;

  const productionTypes = PRODUCTION_TYPES.reduce((totals, type) => {
    totals[type] = 0;
    return totals;
  }, {});
  const workerLoad = {};

  orders.forEach((order) => {
    if (order.operational_visible === false) {
      return;
    }

    const status = normalizeOperationalStatus(order.status);

    if (order.due_date) {
      const dueDate = new Date(`${order.due_date}T00:00:00`);

      if (dueDate < today && !isCompletedOperationalStatus(status)) {
        overdue += 1;
      }

      if (dueDate.getTime() === today.getTime()) {
        dueToday += 1;
      }
    }

    if (["Awaiting Production", "In Production"].includes(status)) {
      activeProduction += 1;
    }

    if (status === "Ready for Pickup") {
      readyForPickup += 1;
    }

    if (order.needs_assignment || !order.assigned_to_staff_name) {
      needsAssignment += 1;
    }

    const productionType = normalizeProductionType(order.decoration_type);
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
