import { create } from 'zustand';
import { DBShape, emptyDB } from '../types/schema';
import { StorageService } from '../services/storage.service';
import { seedDemo } from '../services/seed.service';
import {
  addProduct,
  updateProduct,
  deleteProduct,
  deactivateProduct,
  searchProducts,
  lowStockProducts,
} from '../services/product.service';
import { addPurchase } from '../services/purchase.service';
import { adjustLot as applyLotAdjustment } from '../services/inventory.service';
import { buildSale as buildSaleLocal, grossProfit, SaleDraft } from '../services/sale.service';
import { openCash, closeCash } from '../services/cash.service';
import { addExpense, deleteExpense } from '../services/expense.service';
import { processReturn } from '../services/return.service';
import { addCustomer, searchCustomers } from '../services/customer.service';
import {
  activeSuppliers,
  addSupplier,
  searchSuppliers,
  setSupplierActive,
  updateSupplier,
} from '../services/supplier.service';
import { buildReport, ReportRange, ReportSummary } from '../services/report.service';
import { scheduleCloudSync } from '../services/cloud-sync.service';
import { createSaleInCloud } from '../services/cloud-write.service';
import { loadCloudData } from '../services/cloud-migration.service';
import { isCloudWriteEnabled } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import {
  adjustmentSchema,
  customerSchema,
  expenseSchema,
  nonNegativeAmountSchema,
  productPatchSchema,
  productSchema,
  purchaseSchema,
  returnSchema,
  saleSchema,
  supplierPatchSchema,
  supplierSchema,
} from '../domain/schemas';
import { getErrorMessage } from '../domain/validation';
import { dbSchema } from '../domain/db.schema';

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
  markBackup: () => void;
  replaceDB: (db: DBShape) => void;
  // Toasts
  pushToast: (message: string, type?: Toast['type']) => void;
  popToast: (id: string) => void;
  // Products
  addProduct: (draft: any) => void;
  updateProduct: (id: string, patch: any) => void;
  deleteProduct: (id: string) => void;
  deactivateProduct: (id: string) => void;
  searchProducts: (q: string) => any[];
  lowStockProducts: () => any[];
  // Purchases
  addPurchase: (draft: any) => void;
  // Inventory
  adjustLot: (draft: any) => void;
  // Sales
  buildSale: (draft: SaleDraft) => Promise<any>;
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
  // Suppliers
  addSupplier: (draft: any) => void;
  updateSupplier: (id: string, patch: any) => void;
  setSupplierActive: (id: string, active: boolean) => void;
  searchSuppliers: (q: string) => any[];
  activeSuppliers: () => any[];
  // Reports
  buildReport: (range?: ReportRange) => ReportSummary;
  seedDemo: () => void;
}

export const useAppStore = create<AppStore>((set, get) => {
  const notifyError = (error: unknown) => {
    get().pushToast(getErrorMessage(error), 'error');
  };

  /** Ejecuta una acción de escritura y convierte cualquier excepción en un toast. */
  const safe = (action: () => void) => {
    try {
      action();
    } catch (error) {
      notifyError(error);
    }
  };

  return {
    db: emptyDB(),
    toasts: [],

    load: () => {
      try {
        set({ db: StorageService.load() });
      } catch (error) {
        notifyError(error);
      }
    },
    save: () => {
      const { db } = get();
      StorageService.save(db);
      scheduleCloudSync(db);
    },
    resetDemo: () =>
      safe(() => {
        StorageService.resetDemo();
        set({ db: emptyDB() });
        get().pushToast('Datos reiniciados', 'info');
      }),
    markBackup: () => {
      const { db } = get();
      const newDb: DBShape = {
        ...db,
        settings: { ...db.settings, lastBackupAt: new Date().toISOString() },
      };
      set({ db: newDb });
      get().save();
    },
    replaceDB: db =>
      safe(() => {
        const parsed = dbSchema.parse(db) as DBShape;
        set({ db: parsed });
        get().save();
        get().pushToast('Base de datos restaurada correctamente', 'success');
      }),
    pushToast: (message, type = 'info') => {
      const toast: Toast = { id: Math.random().toString(36), message, type };
      set(s => ({ toasts: [...s.toasts, toast] }));
    },
    popToast: (id: string) => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    },
    addProduct: draft =>
      safe(() => {
        const { db } = get();
        const parsed = productSchema.parse(draft);
        const newDb = addProduct(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Producto agregado', 'success');
      }),
    updateProduct: (id, patch) =>
      safe(() => {
        const { db } = get();
        const parsed = productPatchSchema.parse(patch);
        const newDb = updateProduct(db, id, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Producto actualizado', 'success');
      }),
    deleteProduct: id =>
      safe(() => {
        const { db } = get();
        const newDb = deleteProduct(db, id);
        set({ db: newDb });
        get().save();
        get().pushToast('Producto eliminado', 'success');
      }),
    deactivateProduct: id =>
      safe(() => {
        const { db } = get();
        const newDb = deactivateProduct(db, id);
        set({ db: newDb });
        get().save();
        get().pushToast('Producto desactivado', 'info');
      }),
    searchProducts: (q: string) => searchProducts(get().db, q),
    lowStockProducts: () => lowStockProducts(get().db),
    addPurchase: draft =>
      safe(() => {
        const { db } = get();
        const parsed = purchaseSchema.parse(draft);
        const newDb = addPurchase(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Compra registrada', 'success');
      }),
    adjustLot: draft =>
      safe(() => {
        const { db } = get();
        const parsed = adjustmentSchema.parse(draft);
        const newDb = applyLotAdjustment(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast(
          parsed.reason === 'EXPIRED'
            ? 'Lote vencido descargado'
            : 'Ajuste de inventario registrado',
          'success',
        );
      }),
    buildSale: async draft => {
      try {
        const parsed = saleSchema.parse(draft);

        if (isCloudWriteEnabled) {
          const profile = useAuthStore.getState().profile;
          if (!profile?.organization_id || !profile.store_id) {
            throw new Error('Tu perfil no tiene organización o sucursal asignada');
          }

          const sale = await createSaleInCloud(parsed as SaleDraft, {
            organizationId: profile.organization_id,
            storeId: profile.store_id,
            userId: profile.id,
          });

          try {
            const freshDb = await loadCloudData({
              organizationId: profile.organization_id,
              storeId: profile.store_id,
              userId: profile.id,
            });
            set({ db: freshDb });
            StorageService.save(freshDb);
          } catch (refreshError) {
            console.error('La venta se creó, pero no se pudo refrescar la base', refreshError);
          }

          get().pushToast('Venta registrada', 'success');
          return { sale, dbPatch: {} };
        }

        const { db } = get();
        const result = buildSaleLocal(parsed, db);
        set({ db: { ...db, ...result.dbPatch } as DBShape });
        get().save();
        get().pushToast('Venta registrada', 'success');
        return result;
      } catch (error) {
        notifyError(error);
        return null;
      }
    },
    grossProfit: () => grossProfit(get().db.sales),
    openCash: initialAmount =>
      safe(() => {
        const { db } = get();
        const parsed = nonNegativeAmountSchema.parse(initialAmount);
        const newDb = openCash(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Caja abierta', 'success');
      }),
    closeCash: (sessionId, counted) =>
      safe(() => {
        const { db } = get();
        const parsed = nonNegativeAmountSchema.parse(counted);
        const newDb = closeCash(db, sessionId, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Caja cerrada', 'success');
      }),
    addExpense: draft =>
      safe(() => {
        const { db } = get();
        const parsed = expenseSchema.parse(draft);
        const newDb = addExpense(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Gasto registrado', 'success');
      }),
    deleteExpense: id =>
      safe(() => {
        const { db } = get();
        const newDb = deleteExpense(db, id);
        set({ db: newDb });
        get().save();
        get().pushToast('Gasto eliminado', 'success');
      }),
    processReturn: draft =>
      safe(() => {
        const { db } = get();
        const parsed = returnSchema.parse(draft);
        const newDb = processReturn(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Devolución registrada', 'success');
      }),
    addCustomer: draft =>
      safe(() => {
        const { db } = get();
        const parsed = customerSchema.parse(draft);
        const newDb = addCustomer(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Cliente agregado', 'success');
      }),
    searchCustomers: (q: string) => searchCustomers(get().db, q),
    addSupplier: draft =>
      safe(() => {
        const { db } = get();
        const parsed = supplierSchema.parse(draft);
        const newDb = addSupplier(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Proveedor agregado', 'success');
      }),
    updateSupplier: (id, patch) =>
      safe(() => {
        const { db } = get();
        const parsed = supplierPatchSchema.parse(patch);
        const newDb = updateSupplier(db, id, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Proveedor actualizado', 'success');
      }),
    setSupplierActive: (id, active) =>
      safe(() => {
        const { db } = get();
        const newDb = setSupplierActive(db, id, active);
        set({ db: newDb });
        get().save();
        get().pushToast(active ? 'Proveedor activado' : 'Proveedor desactivado', 'info');
      }),
    searchSuppliers: (q: string) => searchSuppliers(get().db, q),
    activeSuppliers: () => activeSuppliers(get().db),
    buildReport: (range?: ReportRange) => buildReport(get().db, range),
    seedDemo: () =>
      safe(() => {
        const db = seedDemo();
        set({ db });
        get().save();
        get().pushToast('Datos de demo cargados', 'success');
      }),
  };
});
