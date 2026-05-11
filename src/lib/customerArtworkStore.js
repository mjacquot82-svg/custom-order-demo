import { getJsonStorageItem, hasBrowserStorage, setJsonStorageItem } from "./browserStorage";
import { getArtworkDisplayName } from "./orderArtwork";

const STORAGE_KEY = "teeCoCustomerArtwork";

export function getAllCustomerArtwork() {
  if (!hasBrowserStorage()) return [];
  return getJsonStorageItem(STORAGE_KEY, []);
}

export function saveAllCustomerArtwork(artwork) {
  if (!hasBrowserStorage()) return;
  setJsonStorageItem(STORAGE_KEY, artwork);
}

export function getCustomerArtwork(customerId) {
  return getAllCustomerArtwork().filter((item) => item.customer_id === customerId);
}

export function saveCustomerArtwork(customerId, artworkInput) {
  const currentArtwork = getAllCustomerArtwork();
  const createdAt = new Date().toISOString();
  const displayName = getArtworkDisplayName(artworkInput);
  const fileType = artworkInput.file_type || artworkInput.type || "";
  const fileSize = Number(artworkInput.file_size ?? artworkInput.size ?? 0) || 0;

  const artwork = {
    id: `artwork-${Date.now()}`,
    customer_id: customerId,
    name: displayName,
    display_name: artworkInput.display_name || displayName,
    file_name: artworkInput.file_name || artworkInput.original_filename || displayName,
    original_filename:
      artworkInput.original_filename || artworkInput.file_name || displayName,
    file_type: fileType,
    file_size: fileSize,
    preview: artworkInput.preview || artworkInput.preview_url || "",
    preview_url: artworkInput.preview_url || artworkInput.preview || "",
    asset_url:
      artworkInput.asset_url ||
      artworkInput.url ||
      artworkInput.source_url ||
      artworkInput.preview_url ||
      artworkInput.preview ||
      "",
    source_url:
      artworkInput.source_url ||
      artworkInput.asset_url ||
      artworkInput.url ||
      artworkInput.preview_url ||
      artworkInput.preview ||
      "",
    asset_reference:
      artworkInput.asset_reference ||
      artworkInput.asset_id ||
      artworkInput.asset_url ||
      artworkInput.url ||
      artworkInput.source_url ||
      "",
    placement_hint: artworkInput.placement_hint || "",
    notes: artworkInput.notes || "",
    created_at: createdAt,
    updated_at: createdAt,
  };

  const nextArtwork = [artwork, ...currentArtwork];
  saveAllCustomerArtwork(nextArtwork);
  return artwork;
}

export function removeCustomerArtwork(artworkId) {
  const nextArtwork = getAllCustomerArtwork().filter((item) => item.id !== artworkId);
  saveAllCustomerArtwork(nextArtwork);
}

export function updateCustomerArtwork(artworkId, updates) {
  const currentArtwork = getAllCustomerArtwork();
  const nextArtwork = currentArtwork.map((item) =>
    item.id === artworkId
      ? {
          ...item,
          ...updates,
          updated_at: new Date().toISOString(),
        }
      : item
  );

  saveAllCustomerArtwork(nextArtwork);
  return nextArtwork.find((item) => item.id === artworkId);
}
