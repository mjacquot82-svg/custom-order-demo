import { getJsonStorageItem, hasBrowserStorage, setJsonStorageItem } from "./browserStorage";

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

  const artwork = {
    id: `artwork-${Date.now()}`,
    customer_id: customerId,
    name: artworkInput.name || artworkInput.file_name || "Customer artwork",
    file_name: artworkInput.file_name || artworkInput.name || "customer-artwork",
    file_type: artworkInput.file_type || "",
    file_size: artworkInput.file_size || 0,
    preview: artworkInput.preview || "",
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
