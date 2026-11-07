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
import {
  CloudContext,
  adjustLotInCloud,
  closeCashInCloud,
  createCustomerInCloud,
  createExpenseInCloud,
  createProductInCloud,
  createPurchaseInCloud,
  createSaleInCloud,
  createSupplierInCloud,
  deactivateProductInCloud,
  deleteExpenseInCloud,
  openCashInCloud,
  processReturnInCloud,
  updateProductInCloud,
  updateSupplierInCloud,
} from '../services/cloud-write.service';
import { isNetworkError, enqueueSale } from '../services/offline-queue.service';
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
  addProduct: (draft: any) => Promise<void>;
  updateProduct: (id: string, patch: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deactivateProduct: (id: string) => Promise<void>;
  searchProducts: (q: string) => any[];
  lowStockProducts: () => any[];
  // Purchases
  addPurchase: (draft: any) => Promise<void>;
  // Inventory
  adjustLot: (draft: any) => Promise<void>;
  // Sales
  buildSale: (draft: SaleDraft) => Promise<any>;
  grossProfit: () => number;
  // Cash
  openCash: (initialAmount: number) => Promise<void>;
  closeCash: (sessionId: string, counted: number) => Promise<void>;
  // Expenses
  addExpense: (draft: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  // Returns
  processReturn: (draft: any) => Promise<void>;
  // Customers
  addCustomer: (draft: any) => Promise<void>;
  searchCustomers: (q: string) => any[];
  // Suppliers
  addSupplier: (draft: any) => Promise<void>;
  updateSupplier: (id: string, patch: any) => Promise<void>;
  setSupplierActive: (id: string, active: boolean) => Promise<void>;
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

  /** Contexto de organización/sucursal del usuario autenticado. */
  const cloudContext = (): CloudContext => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.organization_id || !profile.store_id) {
      throw new Error('Tu perfil no tiene organización o sucursal asignada');
    }
    return {
      organizationId: profile.organization_id,
      storeId: profile.store_id,
      userId: profile.id,
    };
  };

  /** Refresca la caché local desde Supabase después de una escritura. */
  const refreshFromCloud = async () => {
    const context = cloudContext();
    const freshDb = await loadCloudData(context);
    set({ db: freshDb });
    StorageService.save(freshDb);
  };

  /** Ejecuta una operación en la nube y convierte cualquier error en un toast. */
  const cloudAction = async (action: () => Promise<void>) => {
    try {
      await action();
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
    addProduct: async draft => {
      try {
        const parsed = productSchema.parse(draft);
        if (isCloudWriteEnabled) {
          await createProductInCloud(parsed, cloudContext());
          await refreshFromCloud();
          get().pushToast('Producto agregado', 'success');
          return;
        }
        const { db } = get();
        const newDb = addProduct(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Producto agregado', 'success');
      } catch (error) {
        notifyError(error);
      }
    },
    updateProduct: async (id, patch) => {
      try {
        const parsed = productPatchSchema.parse(patch);
        if (isCloudWriteEnabled) {
          await updateProductInCloud(id, parsed, cloudContext());
          await refreshFromCloud();
          get().pushToast('Producto actualizado', 'success');
          return;
        }
        const { db } = get();
        const newDb = updateProduct(db, id, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Producto actualizado', 'success');
      } catch (error) {
        notifyError(error);
      }
    },
    deleteProduct: async id => {
      if (isCloudWriteEnabled) {
        await cloudAction(async () => {
          await deactivateProductInCloud(id, cloudContext());
          await refreshFromCloud();
          get().pushToast('Producto desactivado (se conserva el historial)', 'info');
        });
        return;
      }
      safe(() => {
        const { db } = get();
        const newDb = deleteProduct(db, id);
        set({ db: newDb });
        get().save();
        get().pushToast('Producto eliminado', 'success');
      });
    },
    deactivateProduct: async id => {
      if (isCloudWriteEnabled) {
        await cloudAction(async () => {
          await deactivateProductInCloud(id, cloudContext());
          await refreshFromCloud();
          get().pushToast('Producto desactivado', 'info');
        });
        return;
      }
      safe(() => {
        const { db } = get();
        const newDb = deactivateProduct(db, id);
        set({ db: newDb });
        get().save();
        get().pushToast('Producto desactivado', 'info');
      });
    },
    searchProducts: (q: string) => searchProducts(get().db, q),
    lowStockProducts: () => lowStockProducts(get().db),
    addPurchase: async draft => {
      try {
        const parsed = purchaseSchema.parse(draft);
        if (isCloudWriteEnabled) {
          await createPurchaseInCloud(parsed, cloudContext());
          await refreshFromCloud();
          get().pushToast('Compra registrada', 'success');
          return;
        }
        const { db } = get();
        const newDb = addPurchase(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Compra registrada', 'success');
      } catch (error) {
        notifyError(error);
      }
    },
    adjustLot: async draft => {
      try {
        const parsed = adjustmentSchema.parse(draft);
        if (isCloudWriteEnabled) {
          await adjustLotInCloud(parsed, cloudContext());
          await refreshFromCloud();
          get().pushToast(
            parsed.reason === 'EXPIRED'
              ? 'Lote vencido descargado'
              : 'Ajuste de inventario registrado',
            'success',
          );
          return;
        }
        const { db } = get();
        const newDb = applyLotAdjustment(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast(
          parsed.reason === 'EXPIRED'
            ? 'Lote vencido descargado'
            : 'Ajuste de inventario registrado',
          'success',
        );
      } catch (error) {
        notifyError(error);
      }
    },
    buildSale: async draft => {
      try {
        const parsed = saleSchema.parse(draft);

        if (isCloudWriteEnabled) {
          const profile = useAuthStore.getState().profile;
          if (!profile?.organization_id || !profile.store_id) {
            throw new Error('Tu perfil no tiene organización o sucursal asignada');
          }

          const context = {
            organizationId: profile.organization_id,
            storeId: profile.store_id,
            userId: profile.id,
          };
          const idempotencyKey = crypto.randomUUID();

          try {
            const sale = await createSaleInCloud(parsed as SaleDraft, context, idempotencyKey);

            try {
              const freshDb = await loadCloudData(context);
              set({ db: freshDb });
              StorageService.save(freshDb);
            } catch (refreshError) {
              console.error('La venta se creó, pero no se pudo refrescar la base', refreshError);
            }

            get().pushToast('Venta registrada', 'success');
            return { sale, dbPatch: {} };
          } catch (error) {
            if (isNetworkError(error)) {
              // Modo offline: registra la venta localmente y la encola para sincronizar.
              const { db } = get();
              const result = buildSaleLocal(parsed, db);
              set({ db: { ...db, ...result.dbPatch } as DBShape });
              get().save();
              enqueueSale(parsed as SaleDraft, context, idempotencyKey);
              get().pushToast('Venta registrada (pendiente de sincronización)', 'info');
              return { sale: result.sale, dbPatch: {} };
            }
            throw error;
          }
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
    openCash: async initialAmount => {
      try {
        const parsed = nonNegativeAmountSchema.parse(initialAmount);
        if (isCloudWriteEnabled) {
          await openCashInCloud(parsed, cloudContext());
          await refreshFromCloud();
          get().pushToast('Caja abierta', 'success');
          return;
        }
        const { db } = get();
        const newDb = openCash(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Caja abierta', 'success');
      } catch (error) {
        notifyError(error);
      }
    },
    closeCash: async (sessionId, counted) => {
      try {
        const parsed = nonNegativeAmountSchema.parse(counted);
        if (isCloudWriteEnabled) {
          await closeCashInCloud(sessionId, parsed, cloudContext());
          await refreshFromCloud();
          get().pushToast('Caja cerrada', 'success');
          return;
        }
        const { db } = get();
        const newDb = closeCash(db, sessionId, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Caja cerrada', 'success');
      } catch (error) {
        notifyError(error);
      }
    },
    addExpense: async draft => {
      try {
        const parsed = expenseSchema.parse(draft);
        if (isCloudWriteEnabled) {
          await createExpenseInCloud(parsed, cloudContext());
          await refreshFromCloud();
          get().pushToast('Gasto registrado', 'success');
          return;
        }
        const { db } = get();
        const newDb = addExpense(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Gasto registrado', 'success');
      } catch (error) {
        notifyError(error);
      }
    },
    deleteExpense: async id => {
      if (isCloudWriteEnabled) {
        await cloudAction(async () => {
          await deleteExpenseInCloud(id, cloudContext());
          await refreshFromCloud();
          get().pushToast('Gasto eliminado', 'success');
        });
        return;
      }
      safe(() => {
        const { db } = get();
        const newDb = deleteExpense(db, id);
        set({ db: newDb });
        get().save();
        get().pushToast('Gasto eliminado', 'success');
      });
    },
    processReturn: async draft => {
      try {
        const parsed = returnSchema.parse(draft);
        if (isCloudWriteEnabled) {
          await processReturnInCloud(parsed, cloudContext());
          await refreshFromCloud();
          get().pushToast('Devolución registrada', 'success');
          return;
        }
        const { db } = get();
        const newDb = processReturn(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Devolución registrada', 'success');
      } catch (error) {
        notifyError(error);
      }
    },
    addCustomer: async draft => {
      try {
        const parsed = customerSchema.parse(draft);
        if (isCloudWriteEnabled) {
          await createCustomerInCloud(parsed, cloudContext());
          await refreshFromCloud();
          get().pushToast('Cliente agregado', 'success');
          return;
        }
        const { db } = get();
        const newDb = addCustomer(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Cliente agregado', 'success');
      } catch (error) {
        notifyError(error);
      }
    },
    searchCustomers: (q: string) => searchCustomers(get().db, q),
    addSupplier: async draft => {
      try {
        const parsed = supplierSchema.parse(draft);
        if (isCloudWriteEnabled) {
          await createSupplierInCloud(parsed, cloudContext());
          await refreshFromCloud();
          get().pushToast('Proveedor agregado', 'success');
          return;
        }
        const { db } = get();
        const newDb = addSupplier(db, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Proveedor agregado', 'success');
      } catch (error) {
        notifyError(error);
      }
    },
    updateSupplier: async (id, patch) => {
      try {
        const parsed = supplierPatchSchema.parse(patch);
        if (isCloudWriteEnabled) {
          await updateSupplierInCloud(id, parsed, cloudContext());
          await refreshFromCloud();
          get().pushToast('Proveedor actualizado', 'success');
          return;
        }
        const { db } = get();
        const newDb = updateSupplier(db, id, parsed);
        set({ db: newDb });
        get().save();
        get().pushToast('Proveedor actualizado', 'success');
      } catch (error) {
        notifyError(error);
      }
    },
    setSupplierActive: async (id, active) => {
      if (isCloudWriteEnabled) {
        await cloudAction(async () => {
          await updateSupplierInCloud(id, { active }, cloudContext());
          await refreshFromCloud();
          get().pushToast(active ? 'Proveedor activado' : 'Proveedor desactivado', 'info');
        });
        return;
      }
      safe(() => {
        const { db } = get();
        const newDb = setSupplierActive(db, id, active);
        set({ db: newDb });
        get().save();
        get().pushToast(active ? 'Proveedor activado' : 'Proveedor desactivado', 'info');
      });
    },
    searchSuppliers: (q: string) => searchSuppliers(get().db, q),
    activeSuppliers: () => activeSuppliers(get().db),
    buildReport: (range?: ReportRange) => buildReport(get().db, range),
    seedDemo: () =>
      safe(() => {
        if (isCloudWriteEnabled) {
          throw new Error(
            'El modo nube usa los datos de Supabase; los datos demo solo están disponibles en modo local',
          );
        }
        const db = seedDemo();
        set({ db });
        get().save();
        get().pushToast('Datos de demo cargados', 'success');
      }),
  };
});
