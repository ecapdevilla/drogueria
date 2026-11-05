import { DBShape, emptyDB, SCHEMA_VERSION } from '../types/schema';

const KEY = 'drogueria_db_v1';

export const StorageService = {
  load(): DBShape {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyDB();
      const db = JSON.parse(raw) as DBShape;
      return migrate(db);
    } catch (e) {
      console.error('Error cargando DB', e);
      return emptyDB();
    }
  },
  save(db: DBShape) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { console.error('Error guardando DB', e); throw e; }
  },
  backup(db: DBShape): string {
    return JSON.stringify({ ...db, exportedAt: new Date().toISOString() }, null, 2);
  },
  restore(json: string): DBShape {
    const db = JSON.parse(json) as DBShape;
    if (!db.version) throw new Error('Copia inválida');
    const migrated = migrate(db);
    this.save(migrated);
    return migrated;
  },
  resetDemo() { localStorage.removeItem(KEY); },
};

function migrate(db: DBShape): DBShape {
  if (!db.version) return emptyDB();
  // espacio para migraciones futuras v1 -> v2
  if (db.version < SCHEMA_VERSION) db.version = SCHEMA_VERSION;
  return db;
}