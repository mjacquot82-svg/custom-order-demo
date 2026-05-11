import {
  createStoredProduct,
  getStoredProduct,
  getStoredProducts,
  updateStoredProduct,
} from "../lib/productsStore";
import { createCrudService } from "./createCrudService";

const productsService = createCrudService({
  table: "products",
  local: {
    list: () => getStoredProducts(),
    getById: (productId) => getStoredProduct(productId),
    create: (product) => createStoredProduct(product),
    update: (productId, updates) => updateStoredProduct(productId, updates),
  },
});

export default productsService;

export const listProducts = () => productsService.list();
export const getProductById = (productId) => productsService.getById(productId);
export const createProductRecord = (product) => productsService.create(product);
export const updateProductRecord = (productId, updates) =>
  productsService.update(productId, updates);

