export function calculateBaseSellPrice(cost = 0, markup = 0) {
  const parsedCost = Number(cost || 0);
  const parsedMarkup = Number(markup || 0);

  return Number(
    (parsedCost + parsedCost * (parsedMarkup / 100)).toFixed(2)
  );
}

export function buildProductPricing(product = {}) {
  const cost = Number(product.cost_price || 0);
  const markup = Number(product.markup_percentage || 0);

  return {
    ...product,
    calculated_base_price: calculateBaseSellPrice(cost, markup),
  };
}
