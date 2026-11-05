import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { StorageService } from '../services/storage.service';
import { seedDemo } from '../services/seed.service';
import { cop } from '../utils/money';

export default function Settings() {
  const db = useAppStore(s => s.db);
  const resetDemo = useAppStore(s => s.resetDemo);
  const seedDemoStore = useAppStore(s => s.seedDemo);
  const save = useAppStore(s => s.save);

  const handleBackup = () => {
    const json = StorageService.backup(db);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `drogueria-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const restored = StorageService.restore(text);
        useAppStore.setState({ db: restored });
        alert('Base de datos restaurada correctamente');
      } catch (e: any) {
        alert('Error al restaurar: ' + e.message);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Configuración</h2>
        <p className="text-sm text-slate-500">Gestion de datos y respaldos</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 border border-slate-200 space-y-4">
        <h3 className="font-semibold text-slate-700">Copia de seguridad y restauración</h3>
        <div className="flex gap-2">
          <Button onClick={handleBackup}>Descargar respaldo (JSON)</Button>
          <Button variant="secondary" onClick={handleRestore}>Restaurar respaldo</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 border border-slate-200 space-y-4">
        <h3 className="font-semibold text-slate-700">Datos de demostración</h3>
        <div className="flex gap-2">
          <Button onClick={seedDemoStore}>Cargar datos demo</Button>
          <Button variant="danger" onClick={resetDemo}>Iniciar demo</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 border border-slate-200 space-y-2">
        <h3 className="font-semibold text-slate-700">Estado de la base de datos</h3>
        <div className="text-sm text-slate-600 space-y-1">
          <p>Versión del esquema: <strong>{db.version}</strong></p>
          <p>Productos: <strong>{db.products.length}</strong></p>
          <p>Lotes: <strong>{db.lots.length}</strong></p>
          <p>Ventas: <strong>{db.sales.length}</strong></p>
          <p>Compras: <strong>{db.purchases.length}</strong></p>
          <p>Gastos: <strong>{db.expenses.length}</strong></p>
          <p>Clientes: <strong>{db.customers.length}</strong></p>
          <p>Ventas totales: <strong>{cop(db.sales.reduce((s, x) => s + x.total, 0))}</strong></p>
        </div>
      </div>
    </div>
  );
}