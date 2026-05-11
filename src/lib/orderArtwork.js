function normalizeText(value) {
  return String(value || "").trim();
}

function uniqueValues(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function getArtworkDisplayName(file = {}) {
  return (
    normalizeText(file.display_name) ||
    normalizeText(file.original_filename) ||
    normalizeText(file.file_name) ||
    normalizeText(file.name) ||
    "Customer artwork"
  );
}

export function normalizeArtworkFile(file = {}) {
  const displayName = getArtworkDisplayName(file);
  const type = normalizeText(file.type) || normalizeText(file.file_type);
  const size = Number(file.size ?? file.file_size ?? 0) || 0;

  return {
    ...file,
    id: file.id || `artwork-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: displayName,
    display_name: normalizeText(file.display_name) || displayName,
    file_name:
      normalizeText(file.file_name) ||
      normalizeText(file.original_filename) ||
      displayName,
    original_filename:
      normalizeText(file.original_filename) ||
      normalizeText(file.file_name) ||
      displayName,
    type,
    file_type: type,
    size,
    file_size: size,
    preview: normalizeText(file.preview) || normalizeText(file.preview_url),
  };
}

function buildFallbackArtworkFiles(fallbackNames = []) {
  return uniqueValues(fallbackNames.map((value) => normalizeText(value))).map((name) =>
    normalizeArtworkFile({
      id: `artwork-reference-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      file_name: name,
      original_filename: name,
      source: "order-metadata",
    })
  );
}

export function getOrderArtworkFiles(order = {}) {
  const storedFiles = Array.isArray(order.artwork_files)
    ? order.artwork_files.map((file) => normalizeArtworkFile(file)).filter(Boolean)
    : [];

  if (storedFiles.length) {
    return storedFiles;
  }

  const placementArtworkNames = Array.isArray(order.placements)
    ? order.placements
        .map((placement) => placement?.artwork_name || placement?.customer_artwork_name)
        .filter(Boolean)
    : [];

  return buildFallbackArtworkFiles([
    order.customer_artwork_name,
    ...placementArtworkNames,
  ]);
}

export function getOrderArtworkNames(order = {}) {
  return getOrderArtworkFiles(order).map((file) => getArtworkDisplayName(file));
}
