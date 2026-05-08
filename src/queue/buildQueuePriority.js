import {
  getOperationalStatusIndex,
  isCompletedOperationalStatus,
  normalizeOperationalStatus,
} from "../orders/orderWorkflow";

export function buildQueuePriority(order = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let overdue = false;
  let dueSoon = false;
  let daysUntilDue = null;

  if (order.due_date) {
    const dueDate = new Date(`${order.due_date}T00:00:00`);
    daysUntilDue = Math.ceil((dueDate - today) / 86400000);
    overdue = daysUntilDue < 0 && !isCompletedOperationalStatus(order.status);
    dueSoon = !overdue && daysUntilDue <= 2;
  }

  const unassigned = !order.assigned_to_staff_id && !order.assigned_to_staff_name;
  const status = normalizeOperationalStatus(order.status);
  const completed = status === "Completed";

  let priorityScore = 0;
  if (overdue) priorityScore += 100;
  if (dueSoon) priorityScore += 50;
  if (unassigned) priorityScore += 25;
  priorityScore += Math.max(0, 20 - getOperationalStatusIndex(status));
  if (completed) priorityScore -= 200;

  return {
    overdue,
    dueSoon,
    unassigned,
    completed,
    daysUntilDue,
    priorityScore,
    priorityLabel: overdue
      ? "Overdue"
      : dueSoon
      ? "Due Soon"
      : unassigned
      ? "Needs Assignment"
      : completed
      ? "Completed"
      : "Normal",
  };
}

export function sortQueueByPriority(orders = []) {
  return [...orders].sort((a, b) => {
    const priorityA = buildQueuePriority(a);
    const priorityB = buildQueuePriority(b);

    if (priorityB.priorityScore !== priorityA.priorityScore) {
      return priorityB.priorityScore - priorityA.priorityScore;
    }

    return String(a.due_date || "9999-12-31").localeCompare(
      String(b.due_date || "9999-12-31")
    );
  });
}
