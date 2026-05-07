import { buildProductPricing } from "./productPricingIntegration";
import { buildProductImageState } from "./productImageIntegration";

export function buildEditableProductView(product = {}) {
  return {
    ...buildProductPricing(product),
    imageState: buildProductImageState(product),
    isEditing: false,
    hasUnsavedChanges: false,
  };
}
