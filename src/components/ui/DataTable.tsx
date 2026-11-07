import React from 'react';
import { Inbox, Pencil, Trash2 } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowAction?: (action: 'edit' | 'delete', row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowAction,
  emptyMessage = 'Sin datos',
  loading = false,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
        Cargando...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Inbox className="h-7 w-7" />
        </div>
        <h3 className="mt-4 font-display text-base font-bold text-slate-800">{emptyMessage}</h3>
      </div>
    );
  }

  const allColumns = [
    ...columns,
    ...(onRowAction ? [{ key: 'actions', header: '', className: 'text-center' }] : []),
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-soft">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            {allColumns.map(column => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${
                  column.className ?? ''
                }`}
              >
                {column.key === 'actions' ? (
                  <span className="sr-only">Acciones</span>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, index) => (
            <tr
              key={(row as { id?: string }).id ?? index}
              className="transition-colors hover:bg-slate-50/80"
            >
              {allColumns.map(column => {
                if (column.key === 'actions') {
                  return (
                    <td key={column.key} className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onRowAction?.('edit', row)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRowAction?.('delete', row)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  );
                }

                return (
                  <td
                    key={column.key}
                    className={`whitespace-nowrap px-4 py-3 text-slate-600 ${column.className ?? ''}`}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
