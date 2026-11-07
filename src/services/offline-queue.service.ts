import { SaleDraft } from './sale.service';
import { CloudContext, createSaleInCloud } from './cloud-write.service';
import { loadCloudData } from './cloud-migration.service';
import { StorageService } from './storage.service';

const STORAGE_KEY = 'drogueria_pending_ops';

export type PendingSaleOp = {
  id: string;
  type: 'sale';
  draft: SaleDraft;
  context: CloudContext;
  idempotencyKey: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

export type PendingOp = PendingSaleOp;

function readQueue(): PendingOp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingOp[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Ignora errores de almacenamiento (cuota excedida).
  }
}

/** Indica si un error parece deberse a red/conectividad. */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('err_') ||
    lower.includes('timeout') ||
    lower.includes('load failed')
  );
}

/** Encola una venta que no pudo enviarse a la nube. */
export function enqueueSale(
  draft: SaleDraft,
  context: CloudContext,
  idempotencyKey: string,
): PendingOp {
  const op: PendingSaleOp = {
    id: crypto.randomUUID(),
    type: 'sale',
    draft,
    context,
    idempotencyKey,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  const queue = readQueue();
  queue.push(op);
  writeQueue(queue);
  return op;
}

/** Lista las operaciones pendientes. */
export function listPending(): PendingOp[] {
  return readQueue();
}

/** Cantidad de operaciones pendientes. */
export function pendingCount(): number {
  return readQueue().length;
}

/** Elimina una operación pendiente por id. */
export function removePending(id: string): void {
  const queue = readQueue().filter(op => op.id !== id);
  writeQueue(queue);
}

/** Marca un error en una operación pendiente. */
export function markPendingError(id: string, error: string): void {
  const queue = readQueue().map(op =>
    op.id === id ? { ...op, lastError: error, attempts: op.attempts + 1 } : op,
  );
  writeQueue(queue);
}

/**
 * Reintenta las operaciones pendientes. Detiene el drenado si la red sigue caída.
 * Devuelve cuántas se sincronizaron y cuántas fallaron.
 */
export async function drainQueue(): Promise<{ synced: number; failed: number }> {
  const queue = readQueue();
  if (!queue.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const op of queue) {
    if (op.type !== 'sale') continue;

    try {
      await createSaleInCloud(op.draft, op.context, op.idempotencyKey);
      removePending(op.id);
      synced += 1;
    } catch (error) {
      if (isNetworkError(error)) {
        // La red sigue caída: detiene el drenado.
        return { synced, failed };
      }
      markPendingError(op.id, error instanceof Error ? error.message : String(error));
      failed += 1;
    }
  }

  // Refresca la caché local desde la nube si algo se sincronizó.
  if (synced > 0) {
    try {
      const last = queue[queue.length - 1];
      if (last) {
        const fresh = await loadCloudData(last.context);
        const { useAppStore } = await import('../store/useAppStore');
        useAppStore.setState({ db: fresh });
        StorageService.save(fresh);
      }
    } catch {
      // Ignora errores de refresco; se reintentará en la próxima sincronización.
    }
  }

  return { synced, failed };
}
