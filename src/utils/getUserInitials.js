export function getUserInitials(name) {
  const trimmedName = String(name ?? "").trim();

  if (!trimmedName) {
    return "U";
  }

  const initials = trimmedName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => {
      const sanitizedPart = String(part).replace(/[^\p{L}]/gu, "");
      return sanitizedPart.charAt(0);
    })
    .join("")
    .toUpperCase();

  return initials || "U";
}
