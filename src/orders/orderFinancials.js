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

function parseCurrency(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]/g, "");

    if (!normalized) return null;

    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : null;
  }

  return null;
}

function normalizeCurrency(value) {
  const amount = parseCurrency(value);

  if (amount === null) return 0;

  return Math.round(amount * 100) / 100;
}

function normalizeText(value, fallback = "") {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
}

function normalizePaymentMethod(method) {
  return PAYMENT_METHOD_OPTIONS.includes(method) ? method : "Other";
}

function resolveCurrency(...values) {
  for (const value of values) {
    const amount = parseCurrency(value);

    if (amount !== null) {
      return normalizeCurrency(amount);
    }
  }

  return null;
}

function sumCurrencies(...values) {
  let total = 0;
  let hasValue = false;

  values.forEach((value) => {
    const amount = parseCurrency(value);

    if (amount !== null) {
      total += amount;
      hasValue = true;
    }
  });

  return hasValue ? normalizeCurrency(total) : null;
}

function resolveQuoteSubtotal(quote = {}) {
  const explicitSubtotal = resolveCurrency(
    quote.subtotal,
    quote.sub_total
  );

  if (explicitSubtotal !== null) {
    return explicitSubtotal;
  }

  const placementSubtotal = resolveCurrency(quote.placement_subtotal);
  const productionSubtotal = resolveCurrency(quote.production_subtotal);
  const productionMethodSubtotal = resolveCurrency(
    quote.production_method_subtotal,
    quote.production_charges_subtotal
  );
  const additionalFeesSubtotal = resolveCurrency(
    quote.additional_fees_subtotal,
    quote.setup_subtotal
  );

  const resolvedProductionSubtotal =
    productionSubtotal ??
    sumCurrencies(productionMethodSubtotal, placementSubtotal);

  return sumCurrencies(
    quote.garment_subtotal,
    resolvedProductionSubtotal,
    additionalFeesSubtotal
  );
}

function resolveOrderSubtotal(order = {}) {
  return (
    resolveCurrency(
      order.subtotal,
      order.sub_total,
      order.pricing?.subtotal,
      order.pricing?.sub_total
    ) ??
    resolveQuoteSubtotal(order.quote) ??
    null
  );
}

function resolveOrderTaxAmount(order = {}) {
  return (
    resolveCurrency(
      order.tax_amount,
      order.tax_total,
      order.tax,
      order.pricing?.tax_amount,
      order.pricing?.tax_total,
      order.pricing?.tax,
      order.quote?.tax_amount,
      order.quote?.tax_total,
      order.quote?.tax
    ) ?? null
  );
}

function resolveOrderTotalAmount(order = {}) {
  return (
    resolveCurrency(
      order.total_amount,
      order.total,
      order.order_total,
      order.grand_total,
      order.pricing?.total_amount,
      order.pricing?.total,
      order.pricing?.order_total,
      order.pricing?.grand_total,
      order.quote?.total_amount,
      order.quote?.total,
      order.quote?.order_total,
      order.quote?.grand_total,
      order.quote?.final_total
    ) ?? null
  );
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
  const resolvedSubtotal = resolveOrderSubtotal(order);
  const resolvedTaxAmount = resolveOrderTaxAmount(order);
  const resolvedTotalAmount = resolveOrderTotalAmount(order);
  const subtotal = normalizeCurrency(
    resolvedSubtotal ??
      (resolvedTotalAmount !== null
        ? normalizeCurrency(resolvedTotalAmount - (resolvedTaxAmount ?? 0))
        : 0)
  );
  const taxAmount = normalizeCurrency(
    resolvedTaxAmount ??
      (resolvedTotalAmount !== null && resolvedSubtotal !== null
        ? Math.max(resolvedTotalAmount - resolvedSubtotal, 0)
        : 0)
  );
  const totalAmount = normalizeCurrency(
    resolvedTotalAmount ?? subtotal + taxAmount
  );
  const depositAmount = normalizeCurrency(order.deposit_amount ?? order.deposit?.amount);
  const historyPaid = normalizeCurrency(
    paymentHistory.reduce((sum, payment) => sum + normalizeCurrency(payment.amount), 0)
  );
  const totalPaid = normalizeCurrency(
    paymentHistory.length
      ? historyPaid
      : resolveCurrency(
          order.total_paid,
          order.amount_paid,
          order.paid_amount,
          order.pricing?.total_paid,
          order.pricing?.amount_paid
        ) ?? historyPaid
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
