import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { KPI } from '../components/charts/KPI';
import { MiniBarChart } from '../components/charts/MiniBarChart';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { cop } from '../utils/money';

export default function Dashboard() {
  const report = useAppStore(s => s.buildReport)();
  const db = useAppStore(s => s.db);

  const paymentData = Object.entries(report.salesByPayment).map(([label, value]) => ({ label, value: value as number }));
  const expenseData = Object.entries(report.expensesByCategory).map(([label, value]) => ({ label, value: value as number }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Ventas totales" value={cop(report.totalSales)} icon="💰" />
        <KPI label="Utilidad bruta" value={cop(report.grossProfit)} icon="📈" />
        <KPI label="Gastos" value={cop(report.totalExpenses)} icon="🧾" />
        <KPI label="Utilidad neta" value={cop(report.netProfit)} icon="🎯" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Ventas por método</h3>
          <MiniBarChart data={paymentData} color="bg-blue-500" />
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Gastos por categoría</h3>
          <MiniBarChart data={expenseData} color="bg-red-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Top productos</h3>
          <Table
            data={report.topProducts}
            columns={[
              { key: 'name', header: 'Producto' },
              { key: 'qty', header: 'Cant.', render: r => r.qty },
              { key: 'revenue', header: 'Ingresos', render: r => cop(r.revenue) },
            ]}
            emptyMessage="Sin ventas aún"
          />
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Stock bajo</h3>
          <Table
            data={report.lowStock}
            columns={[
              { key: 'commercialName', header: 'Producto' },
              { key: 'stock', header: 'Stock' },
              { key: 'minStock', header: 'Mínimo' },
            ]}
            emptyMessage="Sin alertas de stock"
          />
        </div>
      </div>
    </div>
  );
}