const STORAGE_KEY = "teeCoProducts";

function buildPlacementConfig(placements = [], placementPrices = {}) {
  return placements.map((placement) => ({
    id: String(placement || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-"),
    label: placement,
    price: Number(placementPrices?.[placement] || 0),
  }));
}

export const defaultProducts = [
  {
    id: "product-hoodie",
    name: "Pullover Hoodie",
    category: "Hoodie / Sweater",
    product_type: "Pullover Hoodie",
    status: "Active",
    image: "",
    colors: ["Black", "Navy", "Gray", "White"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    placements: ["Left Chest", "Full Front", "Full Back", "Sleeve"],
    placement_prices: {
      "Left Chest": 8,
      "Full Front": 12,
      "Full Back": 18,
      Sleeve: 6,
    },
    placement_config: [
      { id: "left-chest", label: "Left Chest", price: 8 },
      { id: "full-front", label: "Full Front", price: 12 },
      { id: "full-back", label: "Full Back", price: 18 },
      { id: "sleeve", label: "Sleeve", price: 6 },
    ],
    decoration_types: ["Embroidery", "Screen Print", "DTF"],
    notes: "General hoodie option. Add specific brands later when known.",
  },
  {
    id: "product-hat",
    name: "Hat",
    category: "Hat",
    product_type: "Cap / Hat",
    status: "Active",
    image: "",
    colors: ["Black", "Navy", "Gray", "White"],
    sizes: ["OSFA"],
    placements: ["Front", "Side", "Back"],
    placement_prices: {
      Front: 10,
      Side: 6,
      Back: 5,
    },
    placement_config: [
      { id: "front", label: "Front", price: 10 },
      { id: "side", label: "Side", price: 6 },
      { id: "back", label: "Back", price: 5 },
    ],
    decoration_types: ["Embroidery"],
    notes: "Use for caps, snapbacks, and similar headwear.",
  },
  {
    id: "product-tee",
    name: "T-Shirt",
    category: "Shirt",
    product_type: "T-Shirt",
    status: "Active",
    image: "",
    colors: ["Black", "White", "Gray", "Navy"],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
    placements: ["Left Chest", "Full Front", "Full Back", "Sleeve"],
    placement_prices: {
      "Left Chest": 4,
      "Full Front": 12,
      "Full Back": 12,
      Sleeve: 5,
    },
    placement_config: [
      { id: "left-chest", label: "Left Chest", price: 4 },
      { id: "full-front", label: "Full Front", price: 12 },
      { id: "full-back", label: "Full Back", price: 12 },
      { id: "sleeve", label: "Sleeve", price: 5 },
    ],
    decoration_types: ["Screen Print", "DTF", "Embroidery"],
    notes: "Generic shirt category until exact brand catalog is added.",
  },
];

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePlacementPrices(placements, value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  const prices = {};
  const lines = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    const [placement, price] = line.split(":").map((item) => item.trim());
    if (placement) prices[placement] = Number(price) || 0;
  });

  placements.forEach((placement) => {
    if (!(placement in prices)) prices[placement] = 0;
  });

  return prices;
}

function normalizeProduct(product) {
  const placements = normalizeList(
    product.placements ||
      product.placement_options?.map((item) => item.label) ||
      product.placement_config?.map((item) => item.label)
  );
  const placementPrices = normalizePlacementPrices(
    placements,
    product.placement_prices
  );
  const placementConfig = Array.isArray(product.placement_config) && product.placement_config.length
    ? product.placement_config.map((item) => ({
        id:
          item.id ||
          String(item.label || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-"),
        label: item.label || "",
        price: Number(item.price ?? placementPrices[item.label] ?? 0),
      }))
    : buildPlacementConfig(placements, placementPrices);

  return {
    ...product,
    product_type: product.product_type || product.type || product.name || "General",
    placements,
    placement_prices: placementPrices,
    placement_config: placementConfig,
  };
}

export function getStoredProducts() {
  if (typeof window === "undefined") return defaultProducts.map(normalizeProduct);

  try {
    const rawProducts = window.localStorage.getItem(STORAGE_KEY);
    const products = rawProducts ? JSON.parse(rawProducts) : defaultProducts;
    return products.map(normalizeProduct);
  } catch (error) {
    console.error("Unable to read Tee & Co products", error);
    return defaultProducts.map(normalizeProduct);
  }
}

export function saveStoredProducts(products) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products.map(normalizeProduct)));
}

export function createStoredProduct(productInput) {
  const products = getStoredProducts();
  const placements = normalizeList(productInput.placements);
  const placementPrices = normalizePlacementPrices(placements, productInput.placement_prices);
  const product = normalizeProduct({
    ...productInput,
    id: `product-${Date.now()}`,
    status: productInput.status || "Active",
    colors: normalizeList(productInput.colors),
    sizes: normalizeList(productInput.sizes),
    placements,
    placement_prices: placementPrices,
    placement_config: Array.isArray(productInput.placement_config) && productInput.placement_config.length
      ? productInput.placement_config
      : buildPlacementConfig(placements, placementPrices),
    decoration_types: normalizeList(productInput.decoration_types),
  });

  const nextProducts = [product, ...products];
  saveStoredProducts(nextProducts);
  return product;
}

export function updateStoredProduct(productId, updates) {
  const products = getStoredProducts();
  const nextProducts = products.map((product) => {
    if (product.id !== productId) return product;

    const placements = updates.placements ? normalizeList(updates.placements) : product.placements;
    const placementPrices = updates.placement_prices
      ? normalizePlacementPrices(placements, updates.placement_prices)
      : product.placement_prices || normalizePlacementPrices(placements, {});

    return normalizeProduct({
      ...product,
      ...updates,
      colors: updates.colors ? normalizeList(updates.colors) : product.colors,
      sizes: updates.sizes ? normalizeList(updates.sizes) : product.sizes,
      placements,
      placement_prices: placementPrices,
      placement_config:
        Array.isArray(updates.placement_config) && updates.placement_config.length
          ? updates.placement_config
          : buildPlacementConfig(placements, placementPrices),
      decoration_types: updates.decoration_types
        ? normalizeList(updates.decoration_types)
        : product.decoration_types,
    });
  });

  saveStoredProducts(nextProducts);
  return nextProducts.find((product) => product.id === productId);
}

export function deleteStoredProduct(productId) {
  const nextProducts = getStoredProducts().filter((product) => product.id !== productId);
  saveStoredProducts(nextProducts);
}
