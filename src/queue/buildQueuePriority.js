function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildQueuePriority(order = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let overdue = false;
  let dueSoon = false;
  let daysUntilDue = null;

  if (order.due_date) {
    const dueDate = new Date(`${order.due_date}T00:00:00`);
    daysUntilDue = Math.ceil((dueDate - today) / 86400000);
    overdue = daysUntilDue < 0 && normalize(order.status) !== "completed";
    dueSoon = !overdue && daysUntilDue <= 2;
  }

  const unassigned = !order.assigned_to_staff_id && !order.assigned_to_staff_name;
  const paused = ["on hold", "paused"].includes(normalize(order.status));

  let priorityScore = 0;
  if (overdue) priorityScore += 100;
  if (dueSoon) priorityScore += 50;
  if (unassigned) priorityScore += 25;
  if (paused) priorityScore += 10;

  return {
    overdue,
    dueSoon,
    unassigned,
    paused,
    daysUntilDue,
    priorityScore,
    priorityLabel: overdue
      ? "Overdue"
      : dueSoon
      ? "Due Soon"
      : unassigned
      ? "Needs Assignment"
      : paused
      ? "Paused"
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
