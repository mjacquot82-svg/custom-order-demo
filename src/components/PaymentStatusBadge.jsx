function badgeStyle(background, color) {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "6px 10px",
    background,
    color,
    fontSize: "12px",
    fontWeight: 800,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  };
}

function getPaymentStatusStyle(status) {
  if (status === "Paid in Full") return badgeStyle("#dcfce7", "#166534");
  if (status === "Partial" || status === "Deposit Paid") {
    return badgeStyle("#fef3c7", "#92400e");
  }

  return badgeStyle("#e2e8f0", "#334155");
}

export default function PaymentStatusBadge({ status }) {
  return <span style={getPaymentStatusStyle(status)}>{status}</span>;
}
