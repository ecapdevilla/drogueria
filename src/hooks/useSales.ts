import { useAppStore } from '../store/useAppStore';

export function useSales() {
  const sales = useAppStore(s => s.db.sales);
  const buildSale = useAppStore(s => s.buildSale);
  const grossProfit = useAppStore(s => s.grossProfit);
  return { sales, buildSale, grossProfit };
}
