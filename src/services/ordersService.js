import {
  createStoredOrder,
  findStoredOrder,
  getStoredOrders,
  updateStoredOrder,
} from "../lib/ordersStore";
import { createCrudService } from "./createCrudService";

const ordersService = createCrudService({
  table: "orders",
  local: {
    list: () => getStoredOrders(),
    getById: (orderNumber) => findStoredOrder(orderNumber),
    create: (order) => createStoredOrder(order),
    update: (orderNumber, updates) => updateStoredOrder(orderNumber, updates),
  },
  remoteMatchField: "order_number",
});

export default ordersService;

export const listOrders = () => ordersService.list();
export const getOrderByNumber = (orderNumber) => ordersService.getById(orderNumber);
export const createOrderRecord = (order) => ordersService.create(order);
export const updateOrderRecord = (orderNumber, updates) =>
  ordersService.update(orderNumber, updates);

