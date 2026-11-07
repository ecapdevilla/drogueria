import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  Package,
  Receipt,
  ShoppingCart,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { KPI } from '../components/charts/KPI';
import { MiniBarChart } from '../components/charts/MiniBarChart';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/layout/PageHeader';
import { cop } from '../utils/money';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
};

export default function Dashboard() {
  const report = useAppStore(s => s.buildReport)();
  const db = useAppStore(s => s.db);

  const paymentData = Object.entries(report.salesByPayment).map(([label, value]) => ({
    label: PAYMENT_LABELS[label] ?? label,
    value: value as number,
  }));
  const expenseData = Object.entries(report.expensesByCategory).map(([label, value]) => ({
    label,
    value: value as number,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen operativo de tu droguería en tiempo real"
        actions={
          <Link
            to="/pos"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Nueva venta
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI
          label="Ventas totales"
          value={cop(report.totalSales)}
          icon={<Wallet className="h-5 w-5" />}
          tone="brand"
          hint={`${report.salesCount} venta(s) registradas`}
        />
        <KPI
          label="Utilidad bruta"
          value={cop(report.grossProfit)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="emerald"
          hint="Ingresos menos costo de productos"
        />
        <KPI
          label="Gastos"
          value={cop(report.totalExpenses)}
          icon={<Receipt className="h-5 w-5" />}
          tone="rose"
          hint="Gastos operativos acumulados"
        />
        <KPI
          label="Utilidad neta"
          value={cop(report.netProfit)}
          icon={<Target className="h-5 w-5" />}
          tone={report.netProfit >= 0 ? 'amber' : 'rose'}
          hint="Utilidad bruta menos gastos"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="section-title">Ventas por método de pago</h2>
              <p className="mt-0.5 text-xs text-slate-500">Distribución de ingresos</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <CreditCard className="h-5 w-5" />
            </span>
          </div>
          <MiniBarChart
            data={paymentData}
            color="from-brand-500 to-brand-300"
            formatValue={value => value.toLocaleString('es-CO')}
          />
        </section>

        <section className="card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="section-title">Gastos por categoría</h2>
              <p className="mt-0.5 text-xs text-slate-500">Dónde se concentra el gasto</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="h-5 w-5" />
            </span>
          </div>
          <MiniBarChart
            data={expenseData}
            color="from-rose-500 to-rose-300"
            formatValue={value => value.toLocaleString('es-CO')}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand-600" />
              <h2 className="section-title">Top productos</h2>
            </div>
            <Link
              to="/reportes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Ver reportes
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Table
            bare
            data={report.topProducts}
            columns={[
              {
                key: 'name',
                header: 'Producto',
                render: (row: { name: string; qty: number; revenue: number }) => (
                  <span className="font-medium text-slate-800">{row.name}</span>
                ),
              },
              {
                key: 'qty',
                header: 'Cant.',
                render: (row: { name: string; qty: number; revenue: number }) => row.qty,
              },
              {
                key: 'revenue',
                header: 'Ingresos',
                render: (row: { name: string; qty: number; revenue: number }) => cop(row.revenue),
              },
            ]}
            emptyMessage="Sin ventas aún"
          />
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="section-title">Stock bajo</h2>
            </div>
            <Link
              to="/inventario"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Ver inventario
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Table
            bare
            data={report.lowStock}
            columns={[
              {
                key: 'commercialName',
                header: 'Producto',
                render: (row: { commercialName: string; stock: number; minStock: number }) => (
                  <span className="font-medium text-slate-800">{row.commercialName}</span>
                ),
              },
              {
                key: 'stock',
                header: 'Stock',
                render: (row: { commercialName: string; stock: number; minStock: number }) => (
                  <Badge variant="warning">{row.stock} uds.</Badge>
                ),
              },
              {
                key: 'minStock',
                header: 'Mínimo',
                render: (row: { commercialName: string; stock: number; minStock: number }) =>
                  row.minStock,
              },
            ]}
            emptyMessage="Sin alertas de stock"
          />
        </section>
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">Catálogo</h2>
            <p className="mt-0.5 text-xs text-slate-500">Estado general de tu operación</p>
          </div>
          <Package className="h-5 w-5 text-slate-400" />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Productos', db.products.length],
            ['Lotes', db.lots.length],
            ['Clientes', db.customers.length],
            ['Compras', db.purchases.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </dt>
              <dd className="mt-1 font-display text-lg font-bold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
