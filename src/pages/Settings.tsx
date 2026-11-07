import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Cloud,
  Database,
  DatabaseZap,
  Download,
  HardDriveDownload,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/layout/PageHeader';
import { DBShape } from '../types/schema';
import { backupStatus, parseBackup, StorageService } from '../services/storage.service';
import { CloudSyncResult, syncLocalDataToCloud } from '../services/cloud-migration.service';
import { isAuthEnabled } from '../lib/supabase';
import { cop } from '../utils/money';
import { formatDate } from '../utils/date';

export default function Settings() {
  const db = useAppStore(s => s.db);
  const resetDemo = useAppStore(s => s.resetDemo);
  const seedDemoStore = useAppStore(s => s.seedDemo);
  const markBackup = useAppStore(s => s.markBackup);
  const replaceDB = useAppStore(s => s.replaceDB);
  const pushToast = useAppStore(s => s.pushToast);
  const profile = useAuthStore(s => s.profile);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<DBShape | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudResult, setCloudResult] = useState<CloudSyncResult | null>(null);
  const [cloudError, setCloudError] = useState('');

  const status = backupStatus(db);

  const handleBackup = () => {
    markBackup();
    const json = StorageService.backup(useAppStore.getState().db);
    const blob = new Blob([json], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `drogueria-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    pushToast('Respaldo descargado', 'success');
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const restored = parseBackup(text);
      setPending(restored);
    } catch (error) {
      pushToast(
        `Error al leer el respaldo: ${error instanceof Error ? error.message : 'archivo inválido'}`,
        'error',
      );
    }
  };

  const handleRestore = () => {
    if (!pending) return;
    replaceDB(pending);
    setPending(null);
  };

  const handleCloudSync = async () => {
    if (!profile?.organization_id || !profile.store_id) {
      setCloudError('Tu perfil no tiene organización o sucursal asignada.');
      return;
    }

    setCloudLoading(true);
    setCloudError('');
    setCloudResult(null);
    try {
      const result = await syncLocalDataToCloud(db, {
        organizationId: profile.organization_id,
        storeId: profile.store_id,
        userId: profile.id,
      });
      setCloudResult(result);
      window.dispatchEvent(new CustomEvent('drogueria:cloud-sync', { detail: { ok: true } }));
      pushToast('Datos sincronizados con Supabase', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudieron sincronizar los datos';
      setCloudError(message);
      pushToast(message, 'error');
    } finally {
      setCloudLoading(false);
    }
  };

  const stats = [
    ['Versión del esquema', db.version],
    ['Productos', db.products.length],
    ['Lotes', db.lots.length],
    ['Ventas', db.sales.length],
    ['Compras', db.purchases.length],
    ['Gastos', db.expenses.length],
    ['Clientes', db.customers.length],
    ['Ventas totales', cop(db.sales.reduce((sum, sale) => sum + sale.total, 0))],
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Configuración"
        subtitle="Gestiona respaldos, datos de demostración y el estado de la base de datos"
      />

      {status.needsBackup && (
        <section className="card border-amber-200 bg-amber-50/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold tracking-tight text-amber-900">
                  {status.lastBackupAt
                    ? `Han pasado ${status.daysSince} días desde tu último respaldo`
                    : 'Aún no has descargado un respaldo'}
                </h2>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Tus datos viven solo en este navegador. Descarga una copia para no perderlos si
                  borras los datos del sitio o cambias de equipo.
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleBackup}>
              <Download className="h-4 w-4" />
              Descargar respaldo
            </Button>
          </div>
        </section>
      )}

      <section className="card p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <HardDriveDownload className="h-5 w-5" />
          </span>
          <div>
            <h2 className="section-title">Copia de seguridad y restauración</h2>
            <p className="text-xs text-slate-500">
              Descarga un respaldo JSON o restaura uno existente.
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Último respaldo:{' '}
          <strong className="text-slate-700">
            {status.lastBackupAt ? formatDate(status.lastBackupAt) : 'Nunca'}
          </strong>
          . Recomendado cada {status.reminderDays} días.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleBackup}>
            <Download className="h-4 w-4" />
            Descargar respaldo
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Restaurar respaldo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Archivo de respaldo"
            onChange={handleFileSelected}
          />
        </div>
      </section>

      {isAuthEnabled && profile && (
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Cloud className="h-5 w-5" />
            </span>
            <div>
              <h2 className="section-title">Sincronización con Supabase</h2>
              <p className="text-xs text-slate-500">
                Sube los datos locales para analítica y respaldo en la nube.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Productos', db.products.length],
              ['Ventas', db.sales.length],
              ['Compras', db.purchases.length],
              ['Gastos', db.expenses.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {label}
                </p>
                <p className="mt-1 font-display text-sm font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          {profile.role === 'admin' ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => setCloudOpen(true)} disabled={cloudLoading}>
                  <Cloud className="h-4 w-4" />
                  {cloudLoading ? 'Sincronizando…' : 'Subir datos a Supabase'}
                </Button>
                <Button variant="secondary" onClick={() => navigate('/analitica')}>
                  Ver analítica
                </Button>
              </div>

              {cloudResult && (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  Sincronizados: {cloudResult.products} productos, {cloudResult.sales} ventas,{' '}
                  {cloudResult.purchases} compras, {cloudResult.expenses} gastos y{' '}
                  {cloudResult.movements} movimientos.
                </p>
              )}
              {cloudError && (
                <p role="alert" className="mt-2 text-xs font-medium text-red-600">
                  {cloudError}
                </p>
              )}

              <p className="mt-2 text-xs text-slate-400">
                Es una sincronización de los datos locales hacia Supabase. No borra nada en este
                navegador. Los cambios locales también se sincronizan automáticamente.
              </p>
            </>
          ) : (
            <p className="mt-4 text-xs text-slate-400">
              Solo un administrador puede sincronizar los datos con Supabase.
            </p>
          )}
        </section>
      )}

      <section className="card p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="section-title">Datos de demostración</h2>
            <p className="text-xs text-slate-500">
              Carga un catálogo de ejemplo o reinicia la base de datos local.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={seedDemoStore}>
            <DatabaseZap className="h-4 w-4" />
            Cargar datos demo
          </Button>
          <Button variant="danger" onClick={() => setResetOpen(true)}>
            <Database className="h-4 w-4" />
            Reiniciar datos
          </Button>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Database className="h-5 w-5" />
          </span>
          <div>
            <h2 className="section-title">Estado de la base de datos</h2>
            <p className="text-xs text-slate-500">
              Los datos se guardan localmente en este navegador.
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {stats.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm"
            >
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-semibold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ConfirmDialog
        open={pending !== null}
        title="Restaurar respaldo"
        confirmLabel="Restaurar datos"
        message={
          pending
            ? `Se reemplazarán todos los datos actuales por el respaldo: ${pending.products.length} productos, ${pending.sales.length} ventas y ${pending.customers.length} clientes. Esta acción no se puede deshacer.`
            : ''
        }
        onConfirm={handleRestore}
        onClose={() => setPending(null)}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Reiniciar datos"
        confirmLabel="Reiniciar"
        message="Se borrarán todos los datos guardados en este navegador y la aplicación quedará vacía. Descarga un respaldo antes de continuar. Esta acción no se puede deshacer."
        onConfirm={resetDemo}
        onClose={() => setResetOpen(false)}
      />

      <ConfirmDialog
        open={cloudOpen}
        title="Subir datos a Supabase"
        confirmLabel="Sincronizar"
        message={`Se subirán ${db.products.length} productos, ${db.sales.length} ventas, ${db.purchases.length} compras y ${db.expenses.length} gastos a la nube. Los datos locales no se borran.`}
        onConfirm={() => void handleCloudSync()}
        onClose={() => setCloudOpen(false)}
      />
    </div>
  );
}
