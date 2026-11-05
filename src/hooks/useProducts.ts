import { useAppStore } from '../store/useAppStore';

export function useProducts() {
  const db = useAppStore(s => s.db);
  const addProduct = useAppStore(s => s.addProduct);
  const updateProduct = useAppStore(s => s.updateProduct);
  const search = useAppStore(s => s.searchProducts);
  const lowStock = useAppStore(s => s.lowStockProducts);
  return { products: db.products, addProduct, updateProduct, search, lowStock };
}