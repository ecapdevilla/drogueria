import { DBShape, emptyDB, SCHEMA_VERSION } from '../types/schema';
import { dbSchema } from '../domain/db.schema';

export const STORAGE_KEY = 'drogueria_db_v1';
export const RECOVERY_KEY_PREFIX = 'drogueria_db_recovery_';
export const BACKUP_REMINDER_DAYS = 7;

type RawDB = Record<string, unknown>;

const isRecord = (value: unknown): value is RawDB =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Migraciones incrementales. La clave es la versión de origen; cada función
 * debe devolver una base con la versión siguiente.
 */
const MIGRATIONS: Record<number, (db: RawDB) => RawDB> = {
  1: db => ({
    ...db,
    settings: {
      backupReminderDays: BACKUP_REMINDER_DAYS,
      ...(isRecord(db.settings) ? db.settings : {}),
    },
    version: 2,
  }),
};

export interface BackupStatus {
  lastBackupAt?: string;
  daysSince: number | null;
  needsBackup: boolean;
  reminderDays: number;
}

/** Aplica las migraciones y valida la forma final de la base. */
export function migrate(input: unknown): DBShape {
  if (!isRecord(input)) throw new Error('Copia inválida');

  let candidate: RawDB = { ...input };
  const version = candidate.version;

  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error('Copia inválida');
  }
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `La copia usa una versión más reciente (v${version}). Actualiza la aplicación antes de restaurarla.`,
    );
  }

  let current = version;
  while (current < SCHEMA_VERSION) {
    const migration = MIGRATIONS[current];
    if (!migration) throw new Error(`No hay migración disponible desde la versión ${current}`);

    candidate = migration(candidate);

    const next = candidate.version;
    if (typeof next !== 'number' || next <= current) throw new Error('Migración inválida');
    current = next;
  }

  try {
    return dbSchema.parse(candidate) as DBShape;
  } catch {
    throw new Error('Copia inválida: la estructura de los datos no es válida');
  }
}

/** Convierte el texto de un respaldo en una base validada, sin guardarla. */
export function parseBackup(json: string): DBShape {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('El archivo no es un JSON válido');
  }
  return migrate(parsed);
}

/** Estado del recordatorio de respaldo. */
export function backupStatus(db: DBShape, now = new Date()): BackupStatus {
  const reminderDays = db.settings?.backupReminderDays ?? BACKUP_REMINDER_DAYS;
  const lastBackupAt = db.settings?.lastBackupAt;

  if (!lastBackupAt) {
    return { lastBackupAt, daysSince: null, needsBackup: true, reminderDays };
  }

  const time = new Date(lastBackupAt).getTime();
  if (Number.isNaN(time)) {
    return { lastBackupAt, daysSince: null, needsBackup: true, reminderDays };
  }

  const daysSince = Math.max(0, Math.floor((now.getTime() - time) / 86400000));
  return { lastBackupAt, daysSince, needsBackup: daysSince >= reminderDays, reminderDays };
}

function quarantine(raw: string) {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    localStorage.setItem(`${RECOVERY_KEY_PREFIX}${stamp}`, raw);
  } catch {
    // Si no hay espacio, al menos no impedimos que la app arranque.
  }
}

export const StorageService = {
  load(): DBShape {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyDB();

      const db = migrate(JSON.parse(raw));
      // Solo reescribe si la migración o normalización cambió los datos.
      if (JSON.stringify(db) !== raw) {
        try {
          StorageService.save(db);
        } catch {
          // La base migrada sigue siendo válida en memoria.
        }
      }
      return db;
    } catch (e) {
      console.error('Error cargando DB', e);
      if (raw) quarantine(raw);
      return emptyDB();
    }
  },
  save(db: DBShape) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Error guardando DB', e);
      throw e;
    }
  },
  backup(db: DBShape): string {
    return JSON.stringify({ ...db, exportedAt: new Date().toISOString() }, null, 2);
  },
  parseBackup,
  restore(json: string): DBShape {
    const db = parseBackup(json);
    StorageService.save(db);
    return db;
  },
  resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
