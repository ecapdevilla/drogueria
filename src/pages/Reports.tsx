import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { cop } from '../utils/money';
import { salesToCSV, movementsToCSV } from '../services/report.service';
import { downloadCSV } from '../utils/csv';

export default function Reports() {
  const report = useAppStore(s => s.buildReport)();
  const db = useAppStore(s => s.db);

  const handleExportSales = () => {
    const csv = salesToCSV(db.sales);
    downloadCSV('ventas.csv', csv);
  };

  const handleExportMovements = () => {
    const csv = movementsToCSV(db.movements, db.products);
    downloadCSV('movimientos.csv', csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Reportes</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportSales}>Exportar ventas CSV</Button>
          <Button variant="secondary" onClick={handleExportMovements}>Exportar movimientos CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <p className="text-xs text-slate-500">Ventas totales</p>
          <p className="text-2xl font-bold text-slate-800">{cop(report.totalSales)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <p className="text-xs text-slate-500">Utilidad bruta</p>
          <p className="text-2xl font-bold text-green-600">{cop(report.grossProfit)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <p className="text-xs text-slate-500">Gastos</p>
          <p className="text-2xl font-bold text-red-600">{cop(report.totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <p className="text-xs text-slate-500">Utilidad neta</p>
          <p className="text-2xl font-bold text-slate-800">{cop(report.netProfit)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Ventas por método de pago</h3>
          {Object.keys(report.salesByPayment).length === 0 ? (
            <EmptyState title="Sin datos" description="No hay ventas registradas" />
          ) : (
            <Table
              data={Object.entries(report.salesByPayment).map(([method, total]) => ({ method, total: total as number }))}
              columns={[
                { key: 'method', header: 'Método' },
                { key: 'total', header: 'Total', render: r => cop(r.total) },
              ]}
            />
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Gastos por categoría</h3>
          {Object.keys(report.expensesByCategory).length === 0 ? (
            <EmptyState title="Sin datos" description="No hay gastos registrados" />
          ) : (
            <Table
              data={Object.entries(report.expensesByCategory).map(([category, total]) => ({ category, total: total as number }))}
              columns={[
                { key: 'category', header: 'Categoría' },
                { key: 'total', header: 'Total', render: r => cop(r.total) },
              ]}
            />
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
        <h3 className="font-semibold text-slate-700 mb-3">Top productos vendidos</h3>
        {report.topProducts.length === 0 ? (
          <EmptyState title="Sin ventas" description="No hay productos vendidos aún" />
        ) : (
          <Table
            data={report.topProducts}
            columns={[
              { key: 'name', header: 'Producto' },
              { key: 'qty', header: 'Unidades' },
              { key: 'revenue', header: 'Ingresos', render: r => cop(r.revenue) },
            ]}
          />
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
        <h3 className="font-semibold text-slate-700 mb-3">Alertas de stock bajo</h3>
        {report.lowStock.length === 0 ? (
          <EmptyState title="Sin alertas" description="Todo el stock está en niveles adecuados" />
        ) : (
          <Table
            data={report.lowStock}
            columns={[
              { key: 'commercialName', header: 'Producto' },
              { key: 'stock', header: 'Stock actual' },
              { key: 'minStock', header: 'Stock mínimo' },
            ]}
          />
        )}
      </div>
    </div>
  );
}