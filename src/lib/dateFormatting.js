function parseDateValue(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const dateOnlyValue = new Date(`${value}T00:00:00`);
    return Number.isNaN(dateOnlyValue.getTime()) ? null : dateOnlyValue;
  }

  const parsedValue = new Date(value);
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue;
}

function formatWithOptions(value, options) {
  const parsedValue = parseDateValue(value);
  if (!parsedValue) return "—";
  return parsedValue.toLocaleString([], options);
}

export function formatShortDate(value) {
  return formatWithOptions(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value, separator = " at ") {
  const parsedValue = parseDateValue(value);
  if (!parsedValue) return "—";

  const date = parsedValue.toLocaleString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = parsedValue.toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${date}${separator}${time}`;
}

export function formatDateTimeParts(value) {
  const parsedValue = parseDateValue(value);
  if (!parsedValue) {
    return { date: "—", time: "—" };
  }

  return {
    date: parsedValue.toLocaleString([], {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    time: parsedValue.toLocaleString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export function toIsoTimestamp(value) {
  const parsedValue = parseDateValue(value);
  return parsedValue ? parsedValue.toISOString() : null;
}
