import { describe, expect, it, vi } from 'vitest';
import {
  BACKUP_REMINDER_DAYS,
  backupStatus,
  migrate,
  parseBackup,
  RECOVERY_KEY_PREFIX,
  StorageService,
  STORAGE_KEY,
} from './storage.service';
import { DBShape, SCHEMA_VERSION } from '../types/schema';
import { makeDB, makeProduct } from '../test/fixtures';

describe('StorageService', () => {
  it('retorna una base vacía cuando no hay datos guardados', () => {
    const db = StorageService.load();
    expect(db.version).toBe(SCHEMA_VERSION);
    expect(db.products).toEqual([]);
  });

  it('guarda y recupera la base de datos', () => {
    const db = makeDB({ products: [makeProduct({ commercialName: 'Loratadina' })] });

    StorageService.save(db);
    const loaded = StorageService.load();

    expect(loaded.products).toHaveLength(1);
    expect(loaded.products[0].commercialName).toBe('Loratadina');
  });

  it('incluye la fecha de exportación en el respaldo', () => {
    const backup = StorageService.backup(makeDB());
    const parsed = JSON.parse(backup) as { exportedAt?: string };

    expect(parsed.exportedAt).toBeTruthy();
  });

  it('restaura un respaldo válido y lo persiste', () => {
    const db = makeDB({ products: [makeProduct()] });
    const restored = StorageService.restore(JSON.stringify(db));

    expect(restored.products).toHaveLength(1);
    expect(StorageService.load().products).toHaveLength(1);
  });

  it('rechaza un respaldo sin versión', () => {
    expect(() => StorageService.restore(JSON.stringify({ products: [] }))).toThrow(
      /Copia inválida/,
    );
  });

  it('rechaza un JSON malformado', () => {
    expect(() => StorageService.restore('{no-es-json')).toThrow();
  });

  it('retorna una base vacía si el almacenamiento está corrupto', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, '{no-es-json');
    const db = StorageService.load();
    expect(db.products).toEqual([]);
    spy.mockRestore();
  });

  it('conserva una copia de los datos corruptos para recuperación manual', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, '{no-es-json');

    StorageService.load();

    const recoveryKey = Object.keys(localStorage).find(key => key.startsWith(RECOVERY_KEY_PREFIX));
    expect(recoveryKey).toBeTruthy();
    expect(localStorage.getItem(recoveryKey!)).toBe('{no-es-json');
    spy.mockRestore();
  });

  it('elimina los datos con resetDemo', () => {
    StorageService.save(makeDB({ products: [makeProduct()] }));
    StorageService.resetDemo();
    expect(StorageService.load().products).toEqual([]);
  });

  it('no reescribe el almacenamiento si la base ya está al día', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeDB()));
    const saveSpy = vi.spyOn(StorageService, 'save');

    StorageService.load();

    expect(saveSpy).not.toHaveBeenCalled();
    saveSpy.mockRestore();
  });

  it('persiste la base migrada desde v1', () => {
    const legacy = { ...makeDB(), version: 1 } as Partial<DBShape>;
    delete legacy.settings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const saveSpy = vi.spyOn(StorageService, 'save');

    StorageService.load();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    saveSpy.mockRestore();
  });
});

describe('migraciones', () => {
  it('migra una base v1 sin settings a la versión actual', () => {
    const legacy = { ...makeDB(), version: 1 } as Partial<DBShape>;
    delete legacy.settings;

    const migrated = migrate(legacy);

    expect(migrated.version).toBe(SCHEMA_VERSION);
    expect(migrated.settings.backupReminderDays).toBe(BACKUP_REMINDER_DAYS);
  });

  it('rechaza una copia de una versión más reciente', () => {
    expect(() => migrate({ ...makeDB(), version: SCHEMA_VERSION + 1 })).toThrow(
      /versión más reciente/i,
    );
  });

  it('rechaza datos con una estructura inválida', () => {
    expect(() => migrate({ version: SCHEMA_VERSION, products: 'no-es-una-lista' })).toThrow(
      /Copia inválida/i,
    );
  });

  it('parseBackup valida pero no guarda en localStorage', () => {
    const legacy = { ...makeDB(), version: 1 } as Partial<DBShape>;
    delete legacy.settings;

    const parsed = parseBackup(JSON.stringify(legacy));

    expect(parsed.version).toBe(SCHEMA_VERSION);
    expect(parsed.settings.backupReminderDays).toBe(BACKUP_REMINDER_DAYS);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('backupStatus', () => {
  const now = new Date('2026-11-10T12:00:00.000Z');

  it('pide respaldo cuando nunca se ha descargado uno', () => {
    expect(backupStatus(makeDB(), now)).toMatchObject({
      lastBackupAt: undefined,
      daysSince: null,
      needsBackup: true,
      reminderDays: BACKUP_REMINDER_DAYS,
    });
  });

  it('no pide respaldo si el último está dentro del plazo', () => {
    const db = makeDB({
      settings: {
        backupReminderDays: 7,
        lastBackupAt: '2026-11-08T12:00:00.000Z',
      },
    });

    expect(backupStatus(db, now)).toMatchObject({ daysSince: 2, needsBackup: false });
  });

  it('pide respaldo cuando se supera el plazo configurado', () => {
    const db = makeDB({
      settings: {
        backupReminderDays: 7,
        lastBackupAt: '2026-11-01T12:00:00.000Z',
      },
    });

    expect(backupStatus(db, now)).toMatchObject({ daysSince: 9, needsBackup: true });
  });

  it('trata una fecha de respaldo inválida como pendiente', () => {
    const db = makeDB({
      settings: { backupReminderDays: 7, lastBackupAt: 'no-es-fecha' },
    });

    expect(backupStatus(db, now)).toMatchObject({ daysSince: null, needsBackup: true });
  });
});
