export const PAYMENT_STATUS_OPTIONS = [
  "Unpaid",
  "Deposit Paid",
  "Partial",
  "Paid in Full",
];

export const PICKUP_STATUS_OPTIONS = [
  "Pending",
  "Ready for Pickup",
  "Picked Up",
];

export const PAYMENT_METHOD_OPTIONS = [
  "Cash",
  "Debit",
  "Credit",
  "E-Transfer",
  "Square Terminal",
  "Other",
];

function normalizeCurrency(value) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) return 0;

  return Math.round(amount * 100) / 100;
}

function normalizeText(value, fallback = "") {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
}

function normalizePaymentMethod(method) {
  return PAYMENT_METHOD_OPTIONS.includes(method) ? method : "Other";
}

function buildLegacyDepositPayment(order) {
  const depositAmount = normalizeCurrency(order?.deposit_amount ?? order?.deposit?.amount);
  const depositStatus = normalizeText(order?.deposit?.status).toLowerCase();

  if (depositAmount <= 0 || depositStatus !== "paid") {
    return null;
  }

  return {
    id: order?.deposit?.id || `payment-deposit-${order?.order_number || Date.now()}`,
    amount: depositAmount,
    method: normalizePaymentMethod(order?.deposit?.method),
    timestamp:
      order?.deposit?.paid_at ||
      order?.deposit?.updated_at ||
      order?.updated_at ||
      order?.created_at ||
      new Date().toISOString(),
    staff_member:
      order?.deposit?.staff_member ||
      order?.deposit?.recorded_by_staff_name ||
      order?.updated_by_staff_name ||
      "Unknown Staff",
    note: normalizeText(order?.deposit?.note, "Deposit recorded."),
  };
}

export function normalizePaymentHistory(history, order = {}) {
  const normalizedHistory = Array.isArray(history)
    ? history
        .filter(Boolean)
        .map((entry, index) => ({
          id:
            entry.id ||
            `payment-${order?.order_number || "order"}-${index}-${normalizeText(entry.timestamp, Date.now())}`,
          amount: normalizeCurrency(entry.amount),
          method: normalizePaymentMethod(entry.method),
          timestamp:
            entry.timestamp ||
            entry.created_at ||
            entry.recorded_at ||
            order?.updated_at ||
            order?.created_at ||
            new Date().toISOString(),
          staff_member:
            normalizeText(entry.staff_member) ||
            normalizeText(entry.staff_name) ||
            "Unknown Staff",
          note: normalizeText(entry.note),
        }))
        .filter((entry) => entry.amount > 0)
    : [];

  const legacyDepositPayment = buildLegacyDepositPayment(order);

  if (!normalizedHistory.length && legacyDepositPayment) {
    normalizedHistory.push(legacyDepositPayment);
  }

  return normalizedHistory.sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  );
}

export function deriveOrderFinancials(order = {}) {
  const paymentHistory = normalizePaymentHistory(order.payment_history, order);
  const subtotal = normalizeCurrency(order.subtotal ?? order.quote?.subtotal);
  const taxAmount = normalizeCurrency(order.tax_amount ?? order.quote?.tax);
  const fallbackTotal = subtotal + taxAmount;
  const totalAmount = normalizeCurrency(order.total_amount ?? order.quote?.total ?? fallbackTotal);
  const depositAmount = normalizeCurrency(order.deposit_amount ?? order.deposit?.amount);
  const totalPaid = normalizeCurrency(
    paymentHistory.reduce((sum, payment) => sum + normalizeCurrency(payment.amount), 0)
  );
  const balanceDue = normalizeCurrency(Math.max(totalAmount - totalPaid, 0));

  let paymentStatus = "Unpaid";
  if (totalPaid > 0) {
    if (totalAmount > 0 && balanceDue <= 0) {
      paymentStatus = "Paid in Full";
    } else if (depositAmount > 0 && totalPaid <= depositAmount) {
      paymentStatus = "Deposit Paid";
    } else {
      paymentStatus = "Partial";
    }
  }

  let pickupStatus = PICKUP_STATUS_OPTIONS.includes(order.pickup_status)
    ? order.pickup_status
    : "Pending";

  if (order.status === "Picked Up" || order.status === "Completed") {
    pickupStatus = "Picked Up";
  } else if (order.status === "Ready for Pickup" && pickupStatus !== "Picked Up") {
    pickupStatus = "Ready for Pickup";
  }

  return {
    subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    deposit_amount: depositAmount,
    total_paid: totalPaid,
    balance_due: balanceDue,
    payment_status: paymentStatus,
    pickup_status: pickupStatus,
    payment_history: paymentHistory,
  };
}

export function normalizeOrderFinancials(order = {}) {
  return {
    ...order,
    ...deriveOrderFinancials(order),
  };
}
