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
  { keys: 'F2', description: 'Enfocar el buscador de la pantalla actual' },
];
