function normalizeLower(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildDepositStatus(order, financials) {
  const depositTarget = Number(financials?.deposit_amount || 0);
  const totalPaid = Number(financials?.total_paid || financials?.amount_paid || 0);
  const depositStatus = normalizeLower(order?.deposit?.status);

  if (depositTarget <= 0) return "No deposit required";
  if (depositStatus === "paid" || totalPaid >= depositTarget) return "Deposit received";
  if (totalPaid > 0) return "Deposit partially received";
  return "Deposit required";
}

export function buildApprovalStatus(order) {
  const approvalStatus = normalizeLower(order?.approval_status);

  if (approvalStatus.includes("approved")) {
    return "Approved";
  }

  if (approvalStatus.includes("revision") || approvalStatus.includes("change")) {
    return "Changes requested";
  }

  return "Awaiting customer approval";
}

export function buildArtworkStatus(order) {
  const artworkCount = Array.isArray(order?.artwork_files) ? order.artwork_files.length : 0;
  const artworkWaiting = normalizeLower(order?.quote_status) === "awaiting artwork approval";

  if (!artworkCount) return "No artwork required";
  if (!artworkWaiting) return "Artwork approved";
  return "Awaiting artwork";
}

export function buildProductionReadiness(order, financials) {
  const depositTarget = Number(financials?.deposit_amount || 0);
  const totalPaid = Number(financials?.total_paid || financials?.amount_paid || 0);
  const depositState = normalizeLower(order?.deposit?.status);
  const approvalState = normalizeLower(order?.approval_status);
  const artworkCount = Array.isArray(order?.artwork_files) ? order.artwork_files.length : 0;
  const artworkWaiting = normalizeLower(order?.quote_status) === "awaiting artwork approval";

  const checks = [
    {
      label: "Customer Approval",
      passed: approvalState.includes("approved"),
      detail: buildApprovalStatus(order),
    },
    {
      label: "Deposit",
      passed: depositTarget <= 0 || depositState === "paid" || totalPaid >= depositTarget,
      detail: buildDepositStatus(order, financials),
    },
    {
      label: "Artwork",
      passed: artworkCount === 0 || !artworkWaiting,
      detail: buildArtworkStatus(order),
    },
  ];

  const remainingRequirements = checks.filter((check) => !check.passed).length;

  return {
    checks,
    ready: remainingRequirements === 0,
    remainingRequirements,
  };
}
