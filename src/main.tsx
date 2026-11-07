import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';
import { STORAGE_KEY, StorageService } from './services/storage.service';
import { loadCloudData } from './services/cloud-migration.service';
import { isCloudWriteEnabled } from './lib/supabase';
import { drainQueue } from './services/offline-queue.service';
import './styles/global.css';

// Restaura la base de datos guardada antes de montar la aplicación.
useAppStore.getState().load();

let lastProfileId: string | null = null;
let hydrating = false;

async function hydrateFromCloud() {
  if (hydrating) return;
  const profile = useAuthStore.getState().profile;
  if (!isCloudWriteEnabled || !profile?.organization_id || !profile.store_id) return;

  hydrating = true;
  try {
    const db = await loadCloudData({
      organizationId: profile.organization_id,
      storeId: profile.store_id,
      userId: profile.id,
    });
    useAppStore.setState({ db });
    StorageService.save(db);
    if (isCloudWriteEnabled) {
      const result = await drainQueue();
      if (result.synced > 0) {
        const fresh = await loadCloudData({
          organizationId: profile.organization_id,
          storeId: profile.store_id,
          userId: profile.id,
        });
        useAppStore.setState({ db: fresh });
        StorageService.save(fresh);
      }
    }
  } catch (error) {
    console.error('No se pudo cargar la base desde Supabase', error);
  } finally {
    hydrating = false;
  }
}

// Al iniciar sesión o cambiar de usuario, hidrata la base desde Supabase.
useAuthStore.subscribe(state => {
  const profileId = state.profile?.id ?? null;
  if (profileId && profileId !== lastProfileId) {
    lastProfileId = profileId;
    void hydrateFromCloud();
  }
  if (!profileId) lastProfileId = null;
});

void useAuthStore.getState().initialize();

// Mantiene sincronizadas las pestañas abiertas del mismo navegador.
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY) useAppStore.getState().load();
});

// Cuando vuelve la conexión, reintenta las operaciones pendientes.
window.addEventListener('online', () => {
  if (isCloudWriteEnabled) void drainQueue();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// La PWA solo se registra en producción para no interferir con el HMR de Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(error => console.error('No se pudo registrar el service worker', error));
  });
}
