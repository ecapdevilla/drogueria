import React, { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** Quita el borde y la sombra cuando la tabla ya vive dentro de una tarjeta. */
  bare?: boolean;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'Sin datos',
  bare = false,
}: TableProps<T>) {
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-slate-400">{emptyMessage}</p>;
  }

  return (
    <div
      className={
        bare
          ? 'overflow-x-auto'
          : 'overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-soft'
      }
    >
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            {columns.map(column => (
              <th
                key={column.key}
                scope="col"
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, index) => (
            <tr
              key={(row as { id?: string }).id ?? index}
              onClick={() => onRowClick?.(row)}
              className={`transition-colors hover:bg-slate-50/80 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map(column => (
                <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
