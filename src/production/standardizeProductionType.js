import { normalizeProductionType } from "../constants/productionTypes";

export function standardizeProductionType(product = {}) {
  return {
    ...product,
    decoration_type: normalizeProductionType(
      product.decoration_type || product.production_type || ""
    ),
  };
}

export function standardizeProductionTypes(items = []) {
  return items.map((item) => standardizeProductionType(item));
}
