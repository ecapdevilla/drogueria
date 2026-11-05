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
}

export function Table<T extends Record<string, any>>({
  data, columns, onRowClick, emptyMessage = 'Sin datos',
}: TableProps<T>) {
  if (!data.length) {
    return <p className="text-center text-slate-400 py-8 text-sm">{emptyMessage}</p>;
  }
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            {columns.map(c => (
              <th key={c.key} className="text-left px-3 py-2 font-medium">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, i) => (
            <tr
              key={i}
              className={`hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(c => (
                <td key={c.key} className="px-3 py-2 text-slate-700">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}