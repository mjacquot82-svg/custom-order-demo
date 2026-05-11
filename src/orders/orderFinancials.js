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

const SUBTOTAL_KEYS = ["subtotal", "sub_total", "subtotal_amount", "subtotalAmount"];
const TAX_KEYS = [
  "tax_amount",
  "tax_total",
  "tax",
  "taxAmount",
  "taxTotal",
  "total_tax",
  "totalTax",
  "sales_tax",
  "salesTax",
];
const TOTAL_KEYS = [
  "total_amount",
  "total",
  "order_total",
  "grand_total",
  "grandTotal",
  "final_total",
  "finalTotal",
  "total_price",
  "totalPrice",
  "amount_total",
  "amountTotal",
];
const ORDER_FINANCIAL_WARNING_CACHE = new Set();

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

function resolveCurrencyFromKeys(source, keys) {
  return resolveCurrency(...keys.map((key) => source?.[key]));
}

function sumLineAmounts(lines, amountKey) {
  if (!Array.isArray(lines) || !lines.length) {
    return null;
  }

  return sumCurrencies(...lines.map((line) => line?.[amountKey]));
}

function buildFinancialSources(order = {}, options = {}) {
  const explicitSources = [];
  const addSource = (value, label) => {
    if (!value || typeof value !== "object") return;
    explicitSources.push({ value, label });
  };

  (options.additionalSources || []).forEach((entry, index) => {
    if (entry && typeof entry === "object" && "value" in entry) {
      addSource(entry.value, entry.label || `additionalSources[${index}]`);
      return;
    }

    addSource(entry, `additionalSources[${index}]`);
  });

  addSource(order, "order");
  addSource(order.pricing, "order.pricing");
  addSource(order.quote, "order.quote");
  addSource(order.quote_snapshot, "order.quote_snapshot");
  addSource(order.quoteSnapshot, "order.quoteSnapshot");
  addSource(order.pricing_summary, "order.pricing_summary");
  addSource(order.pricingSummary, "order.pricingSummary");
  addSource(order.summary, "order.summary");
  addSource(order.totals, "order.totals");
  addSource(order.quote?.pricing, "order.quote.pricing");
  addSource(order.quote?.pricing_summary, "order.quote.pricing_summary");
  addSource(order.quote?.pricingSummary, "order.quote.pricingSummary");
  addSource(order.quote?.summary, "order.quote.summary");
  addSource(order.quote?.totals, "order.quote.totals");
  addSource(order.quote_snapshot?.pricing, "order.quote_snapshot.pricing");
  addSource(order.quote_snapshot?.pricing_summary, "order.quote_snapshot.pricing_summary");
  addSource(order.quote_snapshot?.pricingSummary, "order.quote_snapshot.pricingSummary");
  addSource(order.quote_snapshot?.summary, "order.quote_snapshot.summary");
  addSource(order.quote_snapshot?.totals, "order.quote_snapshot.totals");
  addSource(order.quoteSnapshot?.pricing, "order.quoteSnapshot.pricing");
  addSource(order.quoteSnapshot?.pricing_summary, "order.quoteSnapshot.pricing_summary");
  addSource(order.quoteSnapshot?.pricingSummary, "order.quoteSnapshot.pricingSummary");
  addSource(order.quoteSnapshot?.summary, "order.quoteSnapshot.summary");
  addSource(order.quoteSnapshot?.totals, "order.quoteSnapshot.totals");
  addSource(order.pricing?.summary, "order.pricing.summary");
  addSource(order.pricing?.totals, "order.pricing.totals");

  return explicitSources;
}

function buildSourceBreakdown(source = {}) {
  const placementSubtotal =
    resolveCurrency(source.placement_subtotal) ??
    sumLineAmounts(source.placement_lines, "line_total");
  const productionLineSubtotal = sumLineAmounts(source.production_lines, "line_total");
  const productionMethodSubtotal = resolveCurrency(
    source.production_method_subtotal,
    source.production_charges_subtotal
  );
  const baseProductionSubtotal = productionMethodSubtotal ?? productionLineSubtotal;
  const productionSubtotal =
    resolveCurrency(source.production_subtotal) ??
    sumCurrencies(baseProductionSubtotal, placementSubtotal);
  const additionalFeesSubtotal =
    resolveCurrency(source.additional_fees_subtotal, source.setup_subtotal) ??
    sumLineAmounts(source.setup_fees, "amount");

  return {
    garmentSubtotal: resolveCurrency(source.garment_subtotal),
    placementSubtotal,
    productionSubtotal,
    additionalFeesSubtotal,
  };
}

function collectSourceFinancialCandidates(sourceDescriptor) {
  const { value: source, label } = sourceDescriptor;
  const candidates = { subtotal: [], tax: [], total: [] };
  const pushCandidate = (metric, amount, origin) => {
    if (amount === null) return;

    candidates[metric].push({
      amount: normalizeCurrency(amount),
      source: label,
      origin,
    });
  };

  const explicitSubtotal = resolveCurrencyFromKeys(source, SUBTOTAL_KEYS);
  const explicitTax = resolveCurrencyFromKeys(source, TAX_KEYS);
  const explicitTotal = resolveCurrencyFromKeys(source, TOTAL_KEYS);

  pushCandidate("subtotal", explicitSubtotal, "explicit");
  pushCandidate("tax", explicitTax, "explicit");
  pushCandidate("total", explicitTotal, "explicit");

  const breakdown = buildSourceBreakdown(source);
  const computedSubtotal = sumCurrencies(
    breakdown.garmentSubtotal,
    breakdown.productionSubtotal,
    breakdown.additionalFeesSubtotal
  );
  const resolvedSubtotal = explicitSubtotal ?? computedSubtotal;

  pushCandidate("subtotal", computedSubtotal, "computed_breakdown");
  pushCandidate(
    "total",
    explicitTotal ?? sumCurrencies(resolvedSubtotal, explicitTax),
    explicitTotal !== null ? "explicit_or_breakdown" : "computed_subtotal_plus_tax"
  );

  return candidates;
}

function chooseBestCandidate(candidates = []) {
  if (!candidates.length) return null;

  return candidates.find((candidate) => candidate.amount > 0) || candidates[0];
}

function buildCandidateConflict(metric, candidates = []) {
  const uniqueAmounts = [...new Set(candidates.map((candidate) => candidate.amount))];

  if (uniqueAmounts.length <= 1) {
    return null;
  }

  return {
    metric,
    amounts: uniqueAmounts,
    candidates: candidates.map((candidate) => ({
      amount: candidate.amount,
      source: candidate.source,
      origin: candidate.origin,
    })),
  };
}

function warnFinancialNormalization(order, diagnostics) {
  const orderNumber = normalizeText(order?.order_number, "unknown-order");
  const warningKey = JSON.stringify({
    orderNumber,
    unresolved: diagnostics.unresolved,
    conflicts: diagnostics.conflicts,
  });

  if (ORDER_FINANCIAL_WARNING_CACHE.has(warningKey)) {
    return;
  }

  ORDER_FINANCIAL_WARNING_CACHE.add(warningKey);

  console.warn("[orderFinancials] Financial normalization warning", {
    orderNumber,
    unresolved: diagnostics.unresolved,
    conflicts: diagnostics.conflicts,
  });
}

function resolveOrderFinancialCandidates(order = {}, options = {}) {
  const sources = buildFinancialSources(order, options);
  const totals = { subtotal: [], tax: [], total: [] };

  sources.forEach((sourceDescriptor) => {
    const sourceCandidates = collectSourceFinancialCandidates(sourceDescriptor);
    totals.subtotal.push(...sourceCandidates.subtotal);
    totals.tax.push(...sourceCandidates.tax);
    totals.total.push(...sourceCandidates.total);
  });

  const subtotalCandidate = chooseBestCandidate(totals.subtotal);
  const taxCandidate = chooseBestCandidate(totals.tax);
  const totalCandidate = chooseBestCandidate(totals.total);
  const conflicts = ["subtotal", "tax", "total"]
    .map((metric) => buildCandidateConflict(metric, totals[metric]))
    .filter(Boolean);

  const unresolved = [];

  if (!subtotalCandidate && !totalCandidate) {
    unresolved.push("missing_subtotal_and_total");
  }

  if (!totalCandidate && subtotalCandidate && !taxCandidate) {
    unresolved.push("missing_total_with_only_subtotal");
  }

  if (unresolved.length || conflicts.length) {
    warnFinancialNormalization(order, { unresolved, conflicts });
  }

  return {
    subtotalCandidate,
    taxCandidate,
    totalCandidate,
  };
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

export function deriveOrderFinancials(order = {}, options = {}) {
  const paymentHistory = normalizePaymentHistory(order.payment_history, order);
  const {
    subtotalCandidate,
    taxCandidate,
    totalCandidate,
  } = resolveOrderFinancialCandidates(order, options);
  const resolvedSubtotal = subtotalCandidate?.amount ?? null;
  const resolvedTaxAmount = taxCandidate?.amount ?? null;
  const resolvedTotalAmount = totalCandidate?.amount ?? null;
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

export function normalizeOrderFinancials(order = {}, options = {}) {
  return {
    ...order,
    ...deriveOrderFinancials(order, options),
  };
}
