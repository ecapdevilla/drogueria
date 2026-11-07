import { Product, DBShape } from '../types';
import { id } from '../utils/id';

export interface ProductDraft {
  internalCode?: string;
  barcode?: string;
  commercialName: string;
  genericName?: string;
  category: string;
  activeIngredient?: string;
  concentration?: string;
  presentation?: string;
  pharmaceuticalForm?: string;
  invimaRegistry?: string;
  purchasePrice: number;
  salePrice: number;
  minStock?: number;
  mainSupplierId?: string;
  storageConditions?: string;
}

export function addProduct(db: DBShape, draft: ProductDraft): DBShape {
  const product: Product = {
    id: id(),
    internalCode: draft.internalCode ?? '',
    barcode: draft.barcode ?? '',
    commercialName: draft.commercialName,
    genericName: draft.genericName,
    category: draft.category,
    activeIngredient: draft.activeIngredient,
    concentration: draft.concentration,
    presentation: draft.presentation,
    pharmaceuticalForm: draft.pharmaceuticalForm,
    invimaRegistry: draft.invimaRegistry,
    purchasePrice: Math.round(draft.purchasePrice),
    salePrice: Math.round(draft.salePrice),
    stock: 0,
    minStock: draft.minStock ?? 0,
    mainSupplierId: draft.mainSupplierId,
    storageConditions: draft.storageConditions,
    active: true,
    createdAt: new Date().toISOString(),
  };
  return { ...db, products: [...db.products, product] };
}

export function updateProduct(db: DBShape, productId: string, patch: Partial<Product>): DBShape {
  return {
    ...db,
    products: db.products.map(p => (p.id === productId ? { ...p, ...patch } : p)),
  };
}

export function deleteProduct(db: DBShape, productId: string): DBShape {
  return {
    ...db,
    products: db.products.filter(p => p.id !== productId),
  };
}

export function deactivateProduct(db: DBShape, productId: string): DBShape {
  return updateProduct(db, productId, { active: false });
}

export function searchProducts(db: DBShape, query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return db.products.filter(p => p.active);
  return db.products.filter(
    p =>
      p.active &&
      (p.commercialName.toLowerCase().includes(q) ||
        p.internalCode.toLowerCase().includes(q) ||
        (p.barcode?.toLowerCase().includes(q) ?? false) ||
        p.category.toLowerCase().includes(q)),
  );
}

export function lowStockProducts(db: DBShape): Product[] {
  return db.products.filter(p => p.active && p.stock <= p.minStock && p.minStock > 0);
}
