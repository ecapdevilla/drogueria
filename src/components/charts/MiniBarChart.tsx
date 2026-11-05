import React from 'react';

interface MiniBarChartProps {
  data: { label: string; value: number }[];
  color?: string;
}

export function MiniBarChart({ data, color = 'bg-blue-500' }: MiniBarChartProps) {
  if (!data.length) return <p className="text-center text-slate-400 text-sm py-4">Sin datos</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-slate-600">{d.value}</span>
          <div
            className={`w-full ${color} rounded-t`}
            style={{ height: `${(d.value / max) * 100}%`, minHeight: '4px' }}
          />
          <span className="text-xs text-slate-500 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}