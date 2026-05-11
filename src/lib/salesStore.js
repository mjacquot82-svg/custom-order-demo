import { buildStaffAuditFields } from "./staffUsersStore";
import { getJsonStorageItem, hasBrowserStorage, setJsonStorageItem } from "./browserStorage";

const STORAGE_KEY = "teeCoQuickSales";

export function getStoredQuickSales() {
  if (!hasBrowserStorage()) return [];
  return getJsonStorageItem(STORAGE_KEY, []);
}

export function saveStoredQuickSales(sales) {
  if (!hasBrowserStorage()) return;
  setJsonStorageItem(STORAGE_KEY, sales);
}

export function createStoredQuickSale(saleInput) {
  const currentSales = getStoredQuickSales();
  const createdAt = new Date().toISOString();
  const saleNumber = saleInput.sale_number || `SALE-${Date.now().toString().slice(-6)}`;

  const staffAudit = buildStaffAuditFields("created");

  const sale = {
    id: `quick-sale-${Date.now()}`,
    sale_number: saleNumber,
    customer_id: saleInput.customer_id || "",
    customer_name: saleInput.customer_name || "Walk-in Customer",
    payment_method: saleInput.payment_method || "Not Recorded",
    payment_status: saleInput.payment_status || "Paid",
    payment_reference: saleInput.payment_reference || "",
    items: saleInput.items || [],
    subtotal: Number(saleInput.subtotal) || 0,
    discount_amount: Number(saleInput.discount_amount) || 0,
    tax_rate: Number(saleInput.tax_rate) || 0,
    tax_total: Number(saleInput.tax_total) || 0,
    total: Number(saleInput.total) || 0,
    amount_paid: Number(saleInput.amount_paid) || 0,
    balance_due: Number(saleInput.balance_due) || 0,
    notes: saleInput.notes || "",
    square_payment_id: saleInput.square_payment_id || "",
    production_order_numbers: saleInput.production_order_numbers || [],
    ...staffAudit,
    created_at: createdAt,
    updated_at: createdAt,
  };

  const nextSales = [sale, ...currentSales];
  saveStoredQuickSales(nextSales);
  return sale;
}

export function findStoredQuickSale(saleNumber) {
  return getStoredQuickSales().find((sale) => sale.sale_number === saleNumber);
}

export function updateStoredQuickSale(saleNumber, updates) {
  const currentSales = getStoredQuickSales();
  let updatedSale = null;

  const nextSales = currentSales.map((sale) => {
    if (sale.sale_number !== saleNumber) return sale;

    updatedSale = {
      ...sale,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return updatedSale;
  });

  saveStoredQuickSales(nextSales);
  return updatedSale;
}
