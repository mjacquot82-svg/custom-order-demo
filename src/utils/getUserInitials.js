const LETTER_SEQUENCE_PATTERN = /\p{L}+/gu;
const GENERIC_FILLER_WORDS = new Set(["generic", "account", "user"]);
const GENERIC_ADMIN_WORDS = new Set(["owner", "admin", "administrator"]);
const GENERIC_STAFF_WORDS = new Set(["staff"]);

function extractSanitizedWords(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFKD")
    .match(LETTER_SEQUENCE_PATTERN)
    ?.map((word) => word.toLowerCase())
    .filter(Boolean) || [];
}

function isGenericLabel(words, genericWords) {
  return (
    words.length > 0 &&
    words.some((word) => genericWords.has(word)) &&
    words.every(
      (word) => genericWords.has(word) || GENERIC_FILLER_WORDS.has(word)
    )
  );
}

export function getUserInitials(name) {
  const words = extractSanitizedWords(name);

  if (isGenericLabel(words, GENERIC_ADMIN_WORDS)) {
    return "AD";
  }

  if (isGenericLabel(words, GENERIC_STAFF_WORDS)) {
    return "ST";
  }

  if (words.length >= 2) {
    return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase();
  }

  return "U";
}
