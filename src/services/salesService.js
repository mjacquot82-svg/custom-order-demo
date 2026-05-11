import {
  createStoredQuickSale,
  findStoredQuickSale,
  getStoredQuickSales,
  updateStoredQuickSale,
} from "../lib/salesStore";
import { createCrudService } from "./createCrudService";

const salesService = createCrudService({
  table: "sales",
  local: {
    list: () => getStoredQuickSales(),
    getById: (saleNumber) => findStoredQuickSale(saleNumber),
    create: (sale) => createStoredQuickSale(sale),
    update: (saleNumber, updates) => updateStoredQuickSale(saleNumber, updates),
  },
  remoteMatchField: "sale_number",
});

export default salesService;

export const listSales = () => salesService.list();
export const getSaleByNumber = (saleNumber) => salesService.getById(saleNumber);
export const createSaleRecord = (sale) => salesService.create(sale);
export const updateSaleRecord = (saleNumber, updates) =>
  salesService.update(saleNumber, updates);
