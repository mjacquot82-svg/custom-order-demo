export function buildUpdatedProduct(existingProduct = {}, updates = {}) {
  return {
    ...existingProduct,
    ...updates,
    updated_at: new Date().toISOString(),
  };
}

export function applyProductUpdate(products = [], updatedProduct = {}) {
  return products.map((product) =>
    product.id === updatedProduct.id ? updatedProduct : product
  );
}
