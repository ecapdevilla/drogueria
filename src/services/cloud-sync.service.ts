import { DBShape } from '../types';
import { isAuthEnabled, isCloudWriteEnabled } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { syncLocalDataToCloud } from './cloud-migration.service';

export const CLOUD_SYNC_STORAGE_KEY = 'drogueria_last_cloud_sync';
const AUTO_SYNC_DELAY = 1500;

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: DBShape | null = null;
let running = false;

function currentContext() {
  const profile = useAuthStore.getState().profile;
  if (!profile?.organization_id || !profile.store_id) return null;
  return {
    organizationId: profile.organization_id,
    storeId: profile.store_id,
    userId: profile.id,
  };
}

async function flush() {
  if (running || !pending) return;

  const context = currentContext();
  if (!context) return;

  const db = pending;
  pending = null;
  running = true;

  try {
    await syncLocalDataToCloud(db, context);
    const at = new Date().toISOString();
    localStorage.setItem(CLOUD_SYNC_STORAGE_KEY, at);
    window.dispatchEvent(
      new CustomEvent('drogueria:cloud-sync', {
        detail: { ok: true, at },
      }),
    );
  } catch (error) {
    console.error('No se pudo sincronizar automáticamente con Supabase', error);
    window.dispatchEvent(new CustomEvent('drogueria:cloud-sync', { detail: { ok: false } }));
  } finally {
    running = false;
    if (pending) void flush();
  }
}

/**
 * Espeja la base local a Supabase después de cada cambio, con debounce.
 * Es una sincronización de analítica/respaldo, no el flujo multiusuario definitivo.
 */
export function scheduleCloudSync(db: DBShape) {
  if (isCloudWriteEnabled) return;
  if (!isAuthEnabled || import.meta.env.VITE_CLOUD_AUTO_SYNC === 'false') return;
  if (useAuthStore.getState().profile?.role !== 'admin') return;

  pending = db;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, AUTO_SYNC_DELAY);
}
