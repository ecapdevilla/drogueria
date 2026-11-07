import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';
import { STORAGE_KEY } from './services/storage.service';
import './styles/global.css';

// Restaura la base de datos guardada antes de montar la aplicación.
useAppStore.getState().load();
void useAuthStore.getState().initialize();

// Mantiene sincronizadas las pestañas abiertas del mismo navegador.
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY) useAppStore.getState().load();
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
