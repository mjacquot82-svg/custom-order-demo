export function normalizeProductImage(image) {
  if (!image) {
    return {
      hasImage: false,
      imageUrl: "",
      imageLabel: "No image uploaded",
    };
  }

  return {
    hasImage: true,
    imageUrl: image,
    imageLabel: "Product image uploaded",
  };
}

export function buildProductImageState(product = {}) {
  return normalizeProductImage(product.image || "");
}
