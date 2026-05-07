export function buildCalculatedProductPricingLabel(product = {}) {
  const value = Number(product.calculated_base_price || 0).toFixed(2);

  return {
    label: `Base Sell Price: $${value}`,
    value: Number(value),
    formattedValue: `$${value}`,
  };
}
