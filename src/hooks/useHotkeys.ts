import { useEffect } from 'react';

export interface Hotkey {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  shift?: boolean;
  /** Permite ejecutarse aunque el foco esté en un input (F1, F2, Escape, etc.). */
  allowInInput?: boolean;
  handler: () => void;
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(
    el &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable),
  );
}

/**
 * Escucha atajos de teclado a nivel de ventana. Las teclas de una sola letra se
 * ignoran mientras se escribe en un input, salvo que marques `allowInInput`.
 */
export function useHotkeys(hotkeys: Hotkey[], deps: unknown[] = []) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const typing = isTyping(event.target);

      for (const hotkey of hotkeys) {
        const keyMatch = event.key.toLowerCase() === hotkey.key.toLowerCase();
        const ctrlMatch = hotkey.ctrl ? event.ctrlKey : !event.ctrlKey;
        const altMatch = hotkey.alt ? event.altKey : !event.altKey;
        const metaMatch = hotkey.meta ? event.metaKey : !event.metaKey;
        const shiftMatch = hotkey.shift ? event.shiftKey : !event.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && metaMatch && shiftMatch) {
          if (typing && !hotkey.allowInInput) continue;
          event.preventDefault();
          hotkey.handler();
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Atajos globales mostrados en el panel de ayuda. */
export const GLOBAL_SHORTCUTS: { keys: string; description: string }[] = [
  { keys: 'F1', description: 'Mostrar u ocultar este panel de ayuda' },
  { keys: 'Alt + 1…9', description: 'Ir a un módulo (1 Dashboard … 9 Devoluciones)' },
  { keys: 'Alt + 0', description: 'Ir a Clientes' },
  { keys: 'Alt + R / A / C', description: 'Ir a Reportes / Analítica / Configuración' },
  { keys: 'F2', description: 'Enfocar el buscador de la pantalla actual' },
];

/** Atajos contextuales que se muestran en F1 según la ruta. */
export const PAGE_SHORTCUTS: Record<string, { keys: string; description: string }[]> = {
  '/productos': [
    { keys: 'Alt + N', description: 'Nuevo producto' },
    { keys: 'F2', description: 'Enfocar el buscador' },
    { keys: 'Ctrl + Enter', description: 'Guardar el producto' },
  ],
  '/inventario': [{ keys: 'F2', description: 'Enfocar el buscador de lotes' }],
  '/compras': [
    { keys: 'Alt + N', description: 'Nueva compra' },
    { keys: 'Enter', description: 'Buscar producto por código de barras' },
    { keys: 'Ctrl + Enter', description: 'Guardar la compra' },
  ],
  '/caja': [
    { keys: 'Alt + N', description: 'Enfocar el monto de apertura' },
    { keys: 'Alt + C', description: 'Enfocar el monto de cierre' },
  ],
  '/gastos': [
    { keys: 'Alt + N', description: 'Nuevo gasto' },
    { keys: 'Ctrl + Enter', description: 'Guardar el gasto' },
  ],
  '/devoluciones': [
    { keys: 'F2', description: 'Enfocar la selección de venta' },
    { keys: 'Ctrl + Enter', description: 'Procesar la devolución' },
  ],
  '/clientes': [
    { keys: 'Alt + N', description: 'Nuevo cliente' },
    { keys: 'F2', description: 'Enfocar el buscador' },
    { keys: 'Ctrl + Enter', description: 'Guardar el cliente' },
  ],
  '/proveedores': [
    { keys: 'Alt + N', description: 'Nuevo proveedor' },
    { keys: 'F2', description: 'Enfocar el buscador' },
    { keys: 'Ctrl + Enter', description: 'Guardar el proveedor' },
  ],
  '/reportes': [
    { keys: 'F2', description: 'Enfocar la fecha inicial' },
    { keys: 'Alt + E', description: 'Exportar ventas CSV' },
  ],
  '/configuracion': [
    { keys: 'Alt + B', description: 'Descargar respaldo' },
    { keys: 'Alt + S', description: 'Abrir sincronización con Supabase' },
  ],
};
