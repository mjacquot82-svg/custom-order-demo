import { buildEditableProductView } from "./buildEditableProductView";

export function buildProductEditorState(products = []) {
  return products.map((product) => buildEditableProductView(product));
}

export function markProductEditing(products = [], productId) {
  return products.map((product) => ({
    ...product,
    isEditing: product.id === productId,
  }));
}
