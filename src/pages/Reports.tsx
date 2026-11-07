import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Receipt,
  ShoppingCart,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { KPI } from '../components/charts/KPI';
import { PageHeader } from '../components/layout/PageHeader';
import { cop } from '../utils/money';
import { formatDateOnly } from '../utils/date';
import { downloadCSV } from '../utils/csv';
import { paymentLabel } from '../utils/payments';
import {
  categoryPerformanceToCSV,
  filterMovementsByRange,
  filterSalesByRange,
  movementsToCSV,
  paymentBreakdownToCSV,
  productPerformanceToCSV,
  salesToCSV,
} from '../services/report.service';

export default function Reports() {
  const db = useAppStore(s => s.db);
  const buildReport = useAppStore(s => s.buildReport);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const range = from || to ? { from: from || undefined, to: to || undefined } : undefined;
  const report = buildReport(range);

  const filteredSales = filterSalesByRange(db.sales, range);
  const filteredMovements = filterMovementsByRange(db.movements, range);

  const invalidRange = Boolean(from && to && from > to);
  const hasFilter = Boolean(from || to);
  const suffix = hasFilter ? `${from || 'inicio'}_${to || 'hoy'}` : 'historico';

  const rangeLabel = hasFilter
    ? [from ? `desde ${formatDateOnly(from)}` : null, to ? `hasta ${formatDateOnly(to)}` : null]
        .filter(Boolean)
        .join(' ')
    : 'todo el historial';

  const paymentTotal = Object.values(report.salesByPayment).reduce((sum, value) => sum + value, 0);
  const paymentRows = Object.entries(report.salesByPayment).map(([method, total]) => ({
    method,
    total,
    share: paymentTotal > 0 ? total / paymentTotal : 0,
  }));
  const expenseRows = Object.entries(report.expensesByCategory).map(([category, total]) => ({
    category,
    total,
  }));
  const productRows = report.productPerformance.slice(0, 10);

  const handleExportSales = () => {
    downloadCSV(`ventas-${suffix}.csv`, salesToCSV(filteredSales));
  };

  const handleExportProducts = () => {
    downloadCSV(
      `utilidad-productos-${suffix}.csv`,
      productPerformanceToCSV(report.productPerformance),
    );
  };

  const handleExportCategories = () => {
    downloadCSV(
      `utilidad-categorias-${suffix}.csv`,
      categoryPerformanceToCSV(report.categoryPerformance),
    );
  };

  const handleExportPayments = () => {
    downloadCSV(`pagos-${suffix}.csv`, paymentBreakdownToCSV(report.salesByPayment));
  };

  const handleExportMovements = () => {
    downloadCSV(`movimientos-${suffix}.csv`, movementsToCSV(filteredMovements, db.products));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        subtitle="Analiza el desempeño del negocio y exporta la información"
        actions={
          <Badge variant="info">
            {report.salesCount} venta{report.salesCount === 1 ? '' : 's'} en el periodo
          </Badge>
        }
      />

      <section className="card p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="Desde"
              type="date"
              value={from}
              max={to || undefined}
              onChange={event => setFrom(event.target.value)}
              className="w-44"
              aria-invalid={invalidRange || undefined}
            />
            <Input
              label="Hasta"
              type="date"
              value={to}
              min={from || undefined}
              onChange={event => setTo(event.target.value)}
              className="w-44"
              aria-invalid={invalidRange || undefined}
            />
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
              >
                Limpiar filtro
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportSales}>
              <Download className="h-4 w-4" />
              Ventas CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportProducts}>
              <Download className="h-4 w-4" />
              Utilidad CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportCategories}>
              <Download className="h-4 w-4" />
              Categorías CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportPayments}>
              <Download className="h-4 w-4" />
              Pagos CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportMovements}>
              <FileSpreadsheet className="h-4 w-4" />
              Movimientos CSV
            </Button>
          </div>
        </div>

        {invalidRange ? (
          <p role="alert" className="mt-2 text-xs font-medium text-red-600">
            La fecha inicial no puede ser posterior a la fecha final.
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Mostrando {rangeLabel}.</p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KPI
          label="Ventas totales"
          value={cop(report.totalSales)}
          icon={<Wallet className="h-5 w-5" />}
          tone="brand"
          hint={`${report.salesCount} venta(s)`}
        />
        <KPI
          label="Ticket promedio"
          value={cop(report.averageTicket)}
          icon={<ShoppingCart className="h-5 w-5" />}
          tone="slate"
          hint="Promedio por venta"
        />
        <KPI
          label="Utilidad bruta"
          value={cop(report.grossProfit)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="emerald"
          hint="Ingresos menos costo"
        />
        <KPI
          label="Gastos"
          value={cop(report.totalExpenses)}
          icon={<Receipt className="h-5 w-5" />}
          tone="rose"
          hint="Gastos operativos"
        />
        <KPI
          label="Utilidad neta"
          value={cop(report.netProfit)}
          icon={<Target className="h-5 w-5" />}
          tone={report.netProfit >= 0 ? 'amber' : 'rose'}
          hint="Resultado del periodo"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="section-title">Ventas por método de pago</h2>
          </div>
          {paymentRows.length === 0 ? (
            <EmptyState title="Sin datos" description="No hay ventas registradas en el periodo." />
          ) : (
            <Table
              bare
              data={paymentRows}
              columns={[
                { key: 'method', header: 'Método', render: row => paymentLabel(row.method) },
                {
                  key: 'total',
                  header: 'Total',
                  render: row => (
                    <span className="font-semibold text-slate-800">{cop(row.total)}</span>
                  ),
                },
                {
                  key: 'share',
                  header: 'Participación',
                  render: row => (
                    <span className="text-xs font-semibold text-slate-500">
                      {(row.share * 100).toFixed(1)}%
                    </span>
                  ),
                },
              ]}
            />
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="section-title">Gastos por categoría</h2>
          </div>
          {expenseRows.length === 0 ? (
            <EmptyState title="Sin datos" description="No hay gastos registrados en el periodo." />
          ) : (
            <Table
              bare
              data={expenseRows}
              columns={[
                { key: 'category', header: 'Categoría' },
                {
                  key: 'total',
                  header: 'Total',
                  render: row => (
                    <span className="font-semibold text-slate-800">{cop(row.total)}</span>
                  ),
                },
              ]}
            />
          )}
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="section-title">Utilidad por producto</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              El descuento global se reparte entre las líneas de cada venta.
            </p>
          </div>
          <BarChart3 className="h-4 w-4 text-slate-400" />
        </div>
        {productRows.length === 0 ? (
          <EmptyState title="Sin ventas" description="No hay productos vendidos en el periodo." />
        ) : (
          <Table
            bare
            data={productRows}
            columns={[
              {
                key: 'name',
                header: 'Producto',
                render: row => <span className="font-medium text-slate-800">{row.name}</span>,
              },
              { key: 'category', header: 'Categoría' },
              { key: 'qty', header: 'Unidades' },
              { key: 'revenue', header: 'Ingresos', render: row => cop(row.revenue) },
              { key: 'cost', header: 'Costo', render: row => cop(row.cost) },
              {
                key: 'profit',
                header: 'Utilidad',
                render: row => (
                  <span
                    className={`font-semibold ${
                      row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {cop(row.profit)}
                  </span>
                ),
              },
            ]}
          />
        )}
        {report.productPerformance.length > productRows.length && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
            Mostrando los 10 productos con mayor utilidad de {report.productPerformance.length}.
            Exporta el CSV para ver todos.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="section-title">Utilidad por categoría</h2>
          </div>
          {report.categoryPerformance.length === 0 ? (
            <EmptyState
              title="Sin ventas"
              description="No hay categorías con ventas en el periodo."
            />
          ) : (
            <Table
              bare
              data={report.categoryPerformance}
              columns={[
                { key: 'category', header: 'Categoría' },
                { key: 'qty', header: 'Unidades' },
                { key: 'revenue', header: 'Ingresos', render: row => cop(row.revenue) },
                {
                  key: 'profit',
                  header: 'Utilidad',
                  render: row => (
                    <span
                      className={`font-semibold ${
                        row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {cop(row.profit)}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="section-title">Top productos vendidos</h2>
          </div>
          {report.topProducts.length === 0 ? (
            <EmptyState title="Sin ventas" description="No hay productos vendidos aún." />
          ) : (
            <Table
              bare
              data={report.topProducts}
              columns={[
                {
                  key: 'name',
                  header: 'Producto',
                  render: row => <span className="font-medium text-slate-800">{row.name}</span>,
                },
                { key: 'qty', header: 'Unidades' },
                { key: 'revenue', header: 'Ingresos', render: row => cop(row.revenue) },
              ]}
            />
          )}
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="section-title">Alertas de stock bajo</h2>
        </div>
        {report.lowStock.length === 0 ? (
          <EmptyState title="Sin alertas" description="Todo el stock está en niveles adecuados." />
        ) : (
          <Table
            bare
            data={report.lowStock}
            columns={[
              {
                key: 'commercialName',
                header: 'Producto',
                render: row => (
                  <span className="font-medium text-slate-800">{row.commercialName}</span>
                ),
              },
              { key: 'stock', header: 'Stock actual' },
              { key: 'minStock', header: 'Stock mínimo' },
            ]}
          />
        )}
      </section>
    </div>
  );
}
