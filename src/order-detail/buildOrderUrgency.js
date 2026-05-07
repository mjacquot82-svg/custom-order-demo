export function buildOrderUrgency(order = {}) {
  if (!order.due_date) {
    return {
      label: "No due date",
      color: "#64748b",
      overdue: false,
      dueSoon: false,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${order.due_date}T00:00:00`);
  const daysRemaining = Math.ceil((dueDate - today) / 86400000);

  if (daysRemaining < 0) {
    return {
      label: `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"}`,
      color: "#b91c1c",
      overdue: true,
      dueSoon: false,
    };
  }

  if (daysRemaining <= 2) {
    return {
      label: `Due in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
      color: "#b45309",
      overdue: false,
      dueSoon: true,
    };
  }

  return {
    label: `Due ${order.due_date}`,
    color: "#64748b",
    overdue: false,
    dueSoon: false,
  };
}
