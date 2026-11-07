import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { KPI } from '../components/charts/KPI';
import { PageHeader } from '../components/layout/PageHeader';
import { cop } from '../utils/money';
import { formatDate, formatDateOnly } from '../utils/date';
import { paymentLabel } from '../utils/payments';
import { AnalyticsData, fetchAnalytics } from '../services/analytics.service';

const EMPTY_DATA: AnalyticsData = {
  salesDaily: [],
  productPerformance: [],
  categoryPerformance: [],
  paymentMix: [],
  customerSummary: [],
  inventoryRisk: [],
};

export default function Analytics() {
  const profile = useAuthStore(s => s.profile);
  const navigate = useNavigate();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<AnalyticsData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profile?.store_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await fetchAnalytics({
        storeId: profile.store_id,
        from: from || undefined,
        to: to || undefined,
      });
      setData(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudieron cargar los datos de analítica',
      );
    } finally {
      setLoading(false);
    }
  }, [profile?.store_id, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onCloudSync = () => void load();
    window.addEventListener('drogueria:cloud-sync', onCloudSync);
    return () => window.removeEventListener('drogueria:cloud-sync', onCloudSync);
  }, [load]);

  const totals = useMemo(() => {
    const salesCount = data.salesDaily.reduce((sum, row) => sum + row.sales_count, 0);
    const totalSales = data.salesDaily.reduce((sum, row) => sum + Number(row.total_sales), 0);
    const grossProfit = data.salesDaily.reduce((sum, row) => sum + Number(row.gross_profit), 0);
    return {
      salesCount,
      totalSales,
      grossProfit,
      averageTicket: salesCount ? totalSales / salesCount : 0,
      margin: totalSales ? grossProfit / totalSales : 0,
    };
  }, [data.salesDaily]);

  if (!profile?.store_id) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analítica" subtitle="Indicadores calculados en Supabase" />
        <EmptyState
          icon={<BarChart3 className="h-7 w-7" />}
          title="Analítica disponible con Supabase"
          description="Inicia sesión con un usuario de la droguería para consultar los indicadores."
          action={
            <Button variant="secondary" onClick={() => navigate('/configuracion')}>
              Ir a Configuración
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analítica"
        subtitle="Indicadores de ventas, utilidad, clientes e inventario desde Supabase"
        actions={
          <Badge variant="info">{profile.store_id ? 'Datos en la nube' : 'Sin tienda'}</Badge>
        }
      />

      <section className="card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="Desde"
              type="date"
              value={from}
              max={to || undefined}
              onChange={event => setFrom(event.target.value)}
              className="w-44"
            />
            <Input
              label="Hasta"
              type="date"
              value={to}
              min={from || undefined}
              onChange={event => setTo(event.target.value)}
              className="w-44"
            />
            {(from || to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
              >
                Limpiar
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            El filtro de fechas aplica a ventas por día.
          </p>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Si no ves tus ventas, sincroniza los datos locales desde{' '}
          <Link to="/configuracion" className="font-semibold text-brand-600 hover:underline">
            Configuración
          </Link>
          .
        </p>
      </section>

      {error ? (
        <section className="card border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            No se pudo cargar la analítica
          </p>
          <p className="mt-1 text-xs leading-5">{error}</p>
          <p className="mt-2 text-xs leading-5">
            Verifica que las vistas SQL del Sprint 7 estén ejecutadas en Supabase.
          </p>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KPI
          label="Ventas totales"
          value={cop(totals.totalSales)}
          icon={<Wallet className="h-5 w-5" />}
          tone="brand"
          hint={`${totals.salesCount} venta(s)`}
        />
        <KPI
          label="Ticket promedio"
          value={cop(totals.averageTicket)}
          icon={<BarChart3 className="h-5 w-5" />}
          tone="slate"
          hint="Por venta"
        />
        <KPI
          label="Utilidad bruta"
          value={cop(totals.grossProfit)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="emerald"
          hint="Ingresos menos costo"
        />
        <KPI
          label="Margen"
          value={`${(totals.margin * 100).toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="amber"
          hint="Utilidad / ventas"
        />
        <KPI
          label="Clientes"
          value={data.customerSummary.length}
          icon={<Users className="h-5 w-5" />}
          tone="slate"
          hint="Con historial"
        />
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="section-title">Ventas por día</h2>
        </div>
        {data.salesDaily.length === 0 ? (
          <EmptyState title="Sin ventas" description="No hay ventas en el rango seleccionado." />
        ) : (
          <Table
            bare
            data={data.salesDaily}
            columns={[
              { key: 'day', header: 'Día', render: row => formatDateOnly(row.day) },
              { key: 'sales_count', header: 'Ventas' },
              {
                key: 'total_sales',
                header: 'Ventas totales',
                render: row => (
                  <span className="font-semibold text-slate-800">{cop(row.total_sales)}</span>
                ),
              },
              {
                key: 'average_ticket',
                header: 'Ticket promedio',
                render: row => cop(row.average_ticket),
              },
              {
                key: 'gross_profit',
                header: 'Utilidad',
                render: row => (
                  <span
                    className={`font-semibold ${
                      Number(row.gross_profit) >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {cop(row.gross_profit)}
                  </span>
                ),
              },
            ]}
          />
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="section-title">Utilidad por producto</h2>
          </div>
          {data.productPerformance.length === 0 ? (
            <EmptyState title="Sin datos" description="Aún no hay productos vendidos." />
          ) : (
            <Table
              bare
              data={data.productPerformance}
              columns={[
                {
                  key: 'product_name',
                  header: 'Producto',
                  render: row => (
                    <span className="font-medium text-slate-800">{row.product_name}</span>
                  ),
                },
                { key: 'category', header: 'Categoría' },
                { key: 'quantity', header: 'Unidades' },
                { key: 'revenue', header: 'Ingresos', render: row => cop(row.revenue) },
                {
                  key: 'profit',
                  header: 'Utilidad',
                  render: row => (
                    <span
                      className={`font-semibold ${
                        Number(row.profit) >= 0 ? 'text-emerald-600' : 'text-red-600'
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
            <h2 className="section-title">Utilidad por categoría</h2>
          </div>
          {data.categoryPerformance.length === 0 ? (
            <EmptyState title="Sin datos" description="Aún no hay categorías con ventas." />
          ) : (
            <Table
              bare
              data={data.categoryPerformance}
              columns={[
                { key: 'category', header: 'Categoría' },
                { key: 'quantity', header: 'Unidades' },
                { key: 'revenue', header: 'Ingresos', render: row => cop(row.revenue) },
                {
                  key: 'profit',
                  header: 'Utilidad',
                  render: row => (
                    <span
                      className={`font-semibold ${
                        Number(row.profit) >= 0 ? 'text-emerald-600' : 'text-red-600'
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
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="section-title">Medios de pago</h2>
          </div>
          {data.paymentMix.length === 0 ? (
            <EmptyState title="Sin pagos" description="No hay pagos registrados." />
          ) : (
            <Table
              bare
              data={data.paymentMix}
              columns={[
                { key: 'method', header: 'Método', render: row => paymentLabel(row.method) },
                { key: 'sales_count', header: 'Ventas' },
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

        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="section-title">Mejores clientes</h2>
          </div>
          {data.customerSummary.length === 0 ? (
            <EmptyState title="Sin clientes" description="Aún no hay clientes con compras." />
          ) : (
            <Table
              bare
              data={data.customerSummary}
              columns={[
                {
                  key: 'name',
                  header: 'Cliente',
                  render: row => <span className="font-medium text-slate-800">{row.name}</span>,
                },
                { key: 'phone', header: 'Teléfono', render: row => row.phone ?? '—' },
                { key: 'sales_count', header: 'Compras' },
                {
                  key: 'total_spent',
                  header: 'Total',
                  render: row => (
                    <span className="font-semibold text-slate-800">{cop(row.total_spent)}</span>
                  ),
                },
                {
                  key: 'last_purchase_at',
                  header: 'Última compra',
                  render: row => (row.last_purchase_at ? formatDate(row.last_purchase_at) : '—'),
                },
              ]}
            />
          )}
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="section-title">Riesgo de inventario</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Stock bajo, vencidos y próximos a vencer.
            </p>
          </div>
          <Package className="h-4 w-4 text-slate-400" />
        </div>
        {data.inventoryRisk.length === 0 ? (
          <EmptyState title="Sin datos" description="No hay productos activos." />
        ) : (
          <Table
            bare
            data={data.inventoryRisk}
            columns={[
              {
                key: 'commercial_name',
                header: 'Producto',
                render: row => (
                  <span className="font-medium text-slate-800">{row.commercial_name}</span>
                ),
              },
              { key: 'category', header: 'Categoría' },
              { key: 'stock', header: 'Stock' },
              { key: 'min_stock', header: 'Mínimo' },
              {
                key: 'expiring_30d',
                header: '≤30 días',
                render: row => (
                  <span className={row.expiring_30d > 0 ? 'font-semibold text-amber-600' : ''}>
                    {row.expiring_30d}
                  </span>
                ),
              },
              {
                key: 'expired_units',
                header: 'Vencidos',
                render: row => (
                  <span className={row.expired_units > 0 ? 'font-semibold text-red-600' : ''}>
                    {row.expired_units}
                  </span>
                ),
              },
              {
                key: 'next_expiry',
                header: 'Próximo vencimiento',
                render: row => (row.next_expiry ? formatDateOnly(row.next_expiry) : '—'),
              },
            ]}
          />
        )}
      </section>

      {loading && (
        <p className="text-center text-xs font-medium text-slate-400">Cargando analítica…</p>
      )}
    </div>
  );
}
