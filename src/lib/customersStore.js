import { getJsonStorageItem, hasBrowserStorage, setJsonStorageItem } from "./browserStorage";

const STORAGE_KEY = "demoCustomers";

export function getStoredCustomers() {
  if (!hasBrowserStorage()) return [];
  return getJsonStorageItem(STORAGE_KEY, []);
}

export function saveStoredCustomers(customers) {
  if (!hasBrowserStorage()) return;
  return setJsonStorageItem(STORAGE_KEY, customers);
}

export function createStoredCustomer(customerInput) {
  const currentCustomers = getStoredCustomers();
  const createdAt = new Date().toISOString();

  const customer = {
    id: `customer-${Date.now()}`,
    name: customerInput.name || "New Customer",
    company: customerInput.company || "",
    phone: customerInput.phone || "",
    email: customerInput.email || "",
    notes: customerInput.notes || "",
    order_numbers: customerInput.order_numbers || [],
    created_at: createdAt,
    updated_at: createdAt,
  };

  const nextCustomers = [customer, ...currentCustomers];
  if (!saveStoredCustomers(nextCustomers)) {
    throw new Error("Unable to save customer. Browser storage write failed.");
  }
  return customer;
}

export function updateStoredCustomer(customerId, updates) {
  const currentCustomers = getStoredCustomers();
  const nextCustomers = currentCustomers.map((customer) =>
    customer.id === customerId
      ? {
          ...customer,
          ...updates,
          updated_at: new Date().toISOString(),
        }
      : customer
  );

  if (!saveStoredCustomers(nextCustomers)) {
    throw new Error("Unable to update customer. Browser storage write failed.");
  }
  return nextCustomers.find((customer) => customer.id === customerId);
}

export function findStoredCustomer(customerId) {
  return getStoredCustomers().find((customer) => customer.id === customerId);
}

export function linkOrderToCustomer(customerId, orderNumber) {
  const customer = findStoredCustomer(customerId);
  if (!customer) return null;

  const orderNumbers = new Set(customer.order_numbers || []);
  orderNumbers.add(orderNumber);

  return updateStoredCustomer(customerId, {
    order_numbers: Array.from(orderNumbers),
  });
}
