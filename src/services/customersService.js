import {
  createStoredCustomer,
  findStoredCustomer,
  getStoredCustomers,
  updateStoredCustomer,
} from "../lib/customersStore";
import { createCrudService } from "./createCrudService";

const customersService = createCrudService({
  table: "customers",
  local: {
    list: () => getStoredCustomers(),
    getById: (customerId) => findStoredCustomer(customerId),
    create: (customer) => createStoredCustomer(customer),
    update: (customerId, updates) => updateStoredCustomer(customerId, updates),
  },
});

export default customersService;

export const listCustomers = () => customersService.list();
export const getCustomerById = (customerId) => customersService.getById(customerId);
export const createCustomerRecord = (customer) => customersService.create(customer);
export const updateCustomerRecord = (customerId, updates) =>
  customersService.update(customerId, updates);

