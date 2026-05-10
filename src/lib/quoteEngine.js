import { getProductPlacementConfig, resolveProductBasePrice } from "./productsStore";

export function getPlacementUnitPrice(product, placementName, quantity = 0) {
  const configEntry = getProductPlacementConfig(product).find(
    (placement) => placement?.label === placementName
  );
  const priceConfig = product?.placement_prices?.[placementName] ?? configEntry?.price;

  if (Array.isArray(priceConfig)) {
    const sortedTiers = [...priceConfig].sort((a, b) => Number(b.min || 0) - Number(a.min || 0));
    const matchingTier = sortedTiers.find((tier) => quantity >= Number(tier.min || 0));
    return Number(matchingTier?.price || 0);
  }

  return Number(priceConfig || 0);
}

export function getGarmentUnitPrice(product) {
  return resolveProductBasePrice(product);
}

export function getProductionUnitPrice(product, productionMethod) {
  return Number(product?.production_method_prices?.[productionMethod] || 0);
}

export function normalizeOrderPlacements(order) {
  if (Array.isArray(order?.placements) && order.placements.length) {
    return order.placements;
  }

  if (order?.placement) {
    return [
      {
        placement: order.placement,
        decoration_type: order.decoration_type || "",
        artwork_id: order.customer_artwork_id || "",
        artwork_name: order.customer_artwork_name || "",
      },
    ];
  }

  return [];
}

export function generateQuoteSnapshot(order, product) {
  const quantity = Number(order?.qty || 0);
  const placements = normalizeOrderPlacements(order);
  const garmentUnitPrice = getGarmentUnitPrice(product);
  const garmentPricingAvailable =
    Number.isFinite(garmentUnitPrice) && Number(garmentUnitPrice) > 0;
  const garmentSubtotal = garmentPricingAvailable ? garmentUnitPrice * quantity : null;
  const productionMethod = order?.decoration_type || "";
  const productionUnitPrice = getProductionUnitPrice(product, productionMethod);
  const productionSubtotal = productionUnitPrice * quantity;

  const placement_lines = placements.map((line) => {
    const placementName = line.placement;
    const unitPrice = getPlacementUnitPrice(product, placementName, quantity);
    const lineTotal = unitPrice * quantity;

    return {
      placement: placementName,
      decoration_type: line.decoration_type || order?.decoration_type || "",
      artwork_id: line.artwork_id || "",
      artwork_name: line.artwork_name || "",
      unit_price: unitPrice,
      quantity,
      line_total: lineTotal,
    };
  });

  const setup_fees = Array.isArray(order?.setup_fees) ? order.setup_fees : [];
  const placementSubtotal = placement_lines.reduce((total, line) => total + Number(line.line_total || 0), 0);
  const decoratedProductionSubtotal = productionSubtotal + placementSubtotal;
  const production_lines = productionMethod
    ? [
        {
          production_method: productionMethod,
          unit_price: productionUnitPrice,
          quantity,
          line_total: productionSubtotal,
        },
      ]
    : [];
  const setupSubtotal = setup_fees.reduce((total, fee) => total + Number(fee.amount || 0), 0);
  const subtotal = garmentPricingAvailable
    ? garmentSubtotal + placementSubtotal + productionSubtotal + setupSubtotal
    : null;

  return {
    order_number: order?.order_number || "",
    customer_name: order?.customer_name || "",
    garment: order?.garment || product?.name || "",
    product_id: order?.product_id || product?.id || "",
    quantity,
    garment_unit_price: garmentUnitPrice,
    garment_subtotal: garmentSubtotal,
    garment_pricing_available: garmentPricingAvailable,
    placement_lines,
    production_method: productionMethod,
    production_lines,
    production_subtotal: decoratedProductionSubtotal,
    production_method_subtotal: productionSubtotal,
    production_charges_subtotal: productionSubtotal,
    setup_fees,
    placement_subtotal: placementSubtotal,
    setup_subtotal: setupSubtotal,
    additional_fees_subtotal: setupSubtotal,
    subtotal,
    tax: null,
    taxes_placeholder: "Calculated at checkout",
    total: subtotal,
    generated_at: new Date().toISOString(),
  };
}
