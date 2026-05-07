export function buildProductImagePreview(product = {}) {
  const image = product.image || product.imageUrl || "";

  return {
    hasPreview: Boolean(image),
    previewUrl: image,
    alt: product.name
      ? `${product.name} preview`
      : "Product preview image",
  };
}
