import React from 'react';
import { Keyboard } from 'lucide-react';
import { Modal } from './ui/Modal';
import { GLOBAL_SHORTCUTS } from '../hooks/useHotkeys';

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  /** Atajos específicos de la pantalla actual. */
  contextual?: { keys: string; description: string }[];
}

export function ShortcutsHelp({ open, onClose, contextual = [] }: ShortcutsHelpProps) {
  const sections = [
    { title: 'Globales', items: GLOBAL_SHORTCUTS },
    ...(contextual.length ? [{ title: 'Esta pantalla', items: contextual }] : []),
  ];

  return (
    <Modal open={open} title="Atajos de teclado" onClose={onClose} size="sm">
      <div className="mb-3 flex items-center gap-2 text-slate-500">
        <Keyboard className="h-4 w-4" />
        <p className="text-xs">Pulsa F1 en cualquier pantalla para volver a abrir este panel.</p>
      </div>

      <div className="space-y-5">
        {sections.map(section => (
          <div key={section.title}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.items.map(item => (
                <li
                  key={item.description}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <span className="text-sm text-slate-600">{item.description}</span>
                  <kbd className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                    {item.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
