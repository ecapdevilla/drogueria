import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export function ToastContainer() {
  const toasts = useAppStore(s => s.toasts);
  const popToast = useAppStore(s => s.popToast);

  React.useEffect(() => {
    toasts.forEach(t => {
      setTimeout(() => popToast(t.id), 3000);
    });
  }, [toasts]);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(t => {
        const colors = {
          success: 'bg-green-600',
          error: 'bg-red-600',
          info: 'bg-slate-800',
        };
        return (
          <div
            key={t.id}
            className={`text-white text-sm px-4 py-2 rounded shadow-lg ${colors[t.type]}`}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
}