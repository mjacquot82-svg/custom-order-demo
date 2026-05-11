import { formatShortDate } from "../lib/dateFormatting";

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function buildDepositRequestContent(order = {}) {
  const customerName = String(order.customer_name || "Customer").trim() || "Customer";
  const orderNumber = order.order_number || "Order";
  const depositAmount = money(order.deposit_amount);
  const remainingBalance = money(order.balance_due);
  const dueDateLine = order.due_date
    ? `Due Date: ${formatShortDate(order.due_date)}\n`
    : "";
  const subject = `Deposit Request for Order #${orderNumber}`;
  const body = [
    `Hello ${customerName},`,
    "",
    `A deposit is requested for your Tee & Co order #${orderNumber}.`,
    "",
    `Deposit Requested: ${depositAmount}`,
    `Remaining Balance: ${remainingBalance}`,
    dueDateLine ? dueDateLine.trimEnd() : "",
    "",
    "Please contact us if you have any questions regarding your order.",
    "",
    "Thank you,",
    "Tee & Co",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    body,
    fullMessage: `Subject: ${subject}\n\n${body}`,
  };
}

export function buildDepositRequestMailto(order = {}) {
  const { subject, body } = buildDepositRequestContent(order);
  const emailAddress = String(order.customer_email || "").trim();
  return `mailto:${encodeURIComponent(emailAddress)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
