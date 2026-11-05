import React from 'react';

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
  data, columns, onRowAction, emptyMessage = 'Sin datos', loading = false,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
        Cargando...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 text-xl mb-2">📭</div>
        <h3 className="font-semibold text-slate-600">{emptyMessage}</h3>
      </div>
    );
  }

  const allColumns = [
    ...columns,
    ...(onRowAction ? [{ key: 'actions', header: '', className: 'text-center' }] : []),
  ];

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
      <table className="min-w-full text-sm divide-y divide-slate-100">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {allColumns.map(c => (
              <th
                key={c.key}
                className={`px-4 py-3 text-left font-medium ${c.className || ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              {allColumns.map(c => {
                if (c.key === 'actions') {
                  return (
                    <td key={c.key} className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onRowAction?.('edit', row)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onRowAction?.('delete', row)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  );
                }
                return (
                  <td key={c.key} className={`px-4 py-3 text-slate-700 ${c.className || ''}`}>
                    {c.render ? c.render(row) : row[c.key]}
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
