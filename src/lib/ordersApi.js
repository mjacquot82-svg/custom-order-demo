import ordersService from "../services/ordersService";

export async function fetchOrders() {
  return ordersService.list();
}

export async function createOrder(order) {
  return ordersService.create(order);
}

export async function updateOrder(orderNumber, updates) {
  return ordersService.update(orderNumber, updates);
}

export async function findOrder(orderNumber) {
  return ordersService.getById(orderNumber);
}
