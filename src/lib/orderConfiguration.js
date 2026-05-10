import { normalizeProductionType, PRODUCTION_TYPES } from "../constants/productionTypes";
import { garments } from "../data/garments";
import { getPlacementUnitPrice } from "./quoteEngine";
import { getProductPlacementConfig } from "./productsStore";

function normalizeLookup(value) {
  return String(value || "").trim().toLowerCase();
}

export function getProductDecorationOptions(product) {
  const sourceOptions =
    Array.isArray(product?.production_methods) && product.production_methods.length
      ? product.production_methods
      : product?.decoration_types;
  const normalizedOptions = Array.isArray(sourceOptions)
    ? sourceOptions.map((type) => normalizeProductionType(type))
    : [];

  return normalizedOptions.length
    ? Array.from(new Set(normalizedOptions))
    : PRODUCTION_TYPES;
}

export function getDefaultDecorationType(product) {
  return getProductDecorationOptions(product)[0] || "Screen Print";
}

export function buildPlacementPricingOptions(product, quantity = 0) {
  return getProductPlacementConfig(product).map((placement) => {
    const unitPrice = getPlacementUnitPrice(product, placement.label, quantity);

    return {
      ...placement,
      unitPrice,
      isIncluded: unitPrice <= 0,
    };
  });
}

export function findProductForGarment(products, garment) {
  const availableProducts = Array.isArray(products) ? products : [];
  if (!garment || !availableProducts.length) return null;

  const directMatch = availableProducts.find((product) => product.id === garment.product_id);
  if (directMatch) return directMatch;

  const garmentCategory = normalizeLookup(garment.category);
  const garmentName = normalizeLookup(garment.display_name);

  return (
    availableProducts.find((product) => normalizeLookup(product.name) === garmentName) ||
    availableProducts.find((product) => normalizeLookup(product.category) === garmentCategory) ||
    null
  );
}

export function resolveCustomerOrderProduct(products, orderState = {}) {
  const availableProducts = Array.isArray(products) ? products : [];
  if (!availableProducts.length) return null;

  const directProductId = orderState.product_id || orderState.productId;
  if (directProductId) {
    const directMatch = availableProducts.find((product) => product.id === directProductId);
    if (directMatch) return directMatch;
  }

  const garment = garments.find((item) => item.garment_id === orderState.garmentId);
  const garmentMatch = findProductForGarment(availableProducts, garment);
  if (garmentMatch) return garmentMatch;

  const garmentName = normalizeLookup(orderState.garmentName);
  const category = normalizeLookup(orderState.category);

  return (
    availableProducts.find((product) => normalizeLookup(product.name) === garmentName) ||
    availableProducts.find((product) => normalizeLookup(product.category) === category) ||
    null
  );
}
