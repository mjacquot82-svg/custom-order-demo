export const PAYMENT_AMOUNT_EPSILON = 0.01;

export function validatePaymentAmount({ amount, remainingBalance }) {
  const parsedAmount = Number(amount);
  const parsedRemainingBalance = Number(remainingBalance);
  const safeRemainingBalance = Number.isFinite(parsedRemainingBalance)
    ? parsedRemainingBalance
    : 0;

  if (!Number.isFinite(parsedAmount)) {
    return {
      valid: false,
      code: "INVALID_NUMBER",
      message: "Enter a valid payment amount.",
    };
  }

  if (parsedAmount <= 0) {
    return {
      valid: false,
      code: "INVALID_AMOUNT",
      message: "Payment amount must be greater than 0.",
    };
  }

  if (parsedAmount - safeRemainingBalance > PAYMENT_AMOUNT_EPSILON) {
    return {
      valid: false,
      code: "OVERPAYMENT",
      message: "Payment exceeds remaining balance.",
    };
  }

  return { valid: true };
}
