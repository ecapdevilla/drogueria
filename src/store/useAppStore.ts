import { create } from 'zustand';
import { DBShape, emptyDB } from '../types/schema';
import { StorageService } from '../services/storage.service';
import { seedDemo } from '../services/seed.service';
import { addProduct, updateProduct, searchProducts, lowStockProducts } from '../services/product.service';
import { addPurchase } from '../services/purchase.service';
import { buildSale, grossProfit, SaleDraft } from '../services/sale.service';
import { openCash, closeCash } from '../services/cash.service';
import { addExpense, deleteExpense } from '../services/expense.service';
import { processReturn } from '../services/return.service';
import { addCustomer, searchCustomers } from '../services/customer.service';
import { buildReport } from '../services/report.service';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppStore {
  db: DBShape;
  toasts: Toast[];
  // Persistence
  load: () => void;
  save: () => void;
  resetDemo: () => void;
  // Toasts
  pushToast: (message: string, type?: Toast['type']) => void;
  popToast: (id: string) => void;
  // Products
  addProduct: (draft: any) => void;
  updateProduct: (id: string, patch: any) => void;
  searchProducts: (q: string) => any[];
  lowStockProducts: () => any[];
  // Purchases
  addPurchase: (draft: any) => void;
  // Sales
  buildSale: (draft: SaleDraft) => any;
  grossProfit: () => number;
  // Cash
  openCash: (initialAmount: number) => void;
  closeCash: (sessionId: string, counted: number) => void;
  // Expenses
  addExpense: (draft: any) => void;
  deleteExpense: (id: string) => void;
  // Returns
  processReturn: (draft: any) => void;
  // Customers
  addCustomer: (draft: any) => void;
  searchCustomers: (q: string) => any[];
  // Reports
  buildReport: () => any;
  seedDemo: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  db: emptyDB(),
  toasts: [],

  load: () => {
    const db = StorageService.load();
    set({ db });
  },
  save: () => {
    const { db } = get();
    StorageService.save(db);
  },
  resetDemo: () => {
    StorageService.resetDemo();
    set({ db: emptyDB() });
  },
  pushToast: (message, type = 'info') => {
    const toast: Toast = { id: Math.random().toString(36), message, type };
    set(s => ({ toasts: [...s.toasts, toast] }));
  },
  popToast: (id: string) => {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
  },
  addProduct: draft => {
    const { db } = get();
    const newDb = addProduct(db, draft);
    set({ db: newDb });
    get().save();
    get().pushToast('Producto agregado', 'success');
  },
  updateProduct: (id, patch) => {
    const { db } = get();
    const newDb = updateProduct(db, id, patch);
    set({ db: newDb });
    get().save();
  },
  searchProducts: (q: string) => searchProducts(get().db, q),
  lowStockProducts: () => lowStockProducts(get().db),
  addPurchase: draft => {
    const { db } = get();
    const newDb = addPurchase(db, draft);
    set({ db: newDb });
    get().save();
    get().pushToast('Compra registrada', 'success');
  },
  buildSale: draft => {
    const { db } = get();
    const result = buildSale(draft, db);
    set({ db: { ...db, ...result.dbPatch } as DBShape });
    get().save();
    get().pushToast('Venta registrada', 'success');
    return result;
  },
  grossProfit: () => grossProfit(get().db.sales),
  openCash: initialAmount => {
    const { db } = get();
    const newDb = openCash(db, initialAmount);
    set({ db: newDb });
    get().save();
    get().pushToast('Caja abierta', 'success');
  },
  closeCash: (sessionId, counted) => {
    const { db } = get();
    const newDb = closeCash(db, sessionId, counted);
    set({ db: newDb });
    get().save();
    get().pushToast('Caja cerrada', 'success');
  },
  addExpense: draft => {
    const { db } = get();
    const newDb = addExpense(db, draft);
    set({ db: newDb });
    get().save();
    get().pushToast('Gasto registrado', 'success');
  },
  deleteExpense: id => {
    const { db } = get();
    const newDb = deleteExpense(db, id);
    set({ db: newDb });
    get().save();
  },
  processReturn: draft => {
    const { db } = get();
    const newDb = processReturn(db, draft);
    set({ db: newDb });
    get().save();
    get().pushToast('Devolución registrada', 'success');
  },
  addCustomer: draft => {
    const { db } = get();
    const newDb = addCustomer(db, draft);
    set({ db: newDb });
    get().save();
    get().pushToast('Cliente agregado', 'success');
  },
  searchCustomers: (q: string) => searchCustomers(get().db, q),
  buildReport: () => buildReport(get().db),
  seedDemo: () => {
    const db = seedDemo();
    set({ db });
    get().save();
    get().pushToast('Datos de demo cargados', 'success');
  },
}));