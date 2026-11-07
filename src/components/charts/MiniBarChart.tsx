import React from 'react';

interface MiniBarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  formatValue?: (value: number) => string;
}

export function MiniBarChart({
  data,
  color = 'from-brand-500 to-brand-400',
  formatValue = value => value.toLocaleString('es-CO'),
}: MiniBarChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-slate-400">
        Sin datos para mostrar
      </div>
    );
  }

  const max = Math.max(...data.map(item => item.value), 1);

  return (
    <div className="flex h-44 items-end gap-3">
      {data.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="flex h-full flex-1 flex-col items-center justify-end gap-2"
        >
          <span className="text-[10px] font-semibold text-slate-500">
            {formatValue(item.value)}
          </span>
          <div
            className={`w-full max-w-14 rounded-t-xl bg-gradient-to-t ${color} transition-all duration-500`}
            style={{ height: `${Math.max((item.value / max) * 100, 4)}%` }}
            role="img"
            aria-label={`${item.label}: ${formatValue(item.value)}`}
          />
          <span
            className="w-full truncate text-center text-[11px] font-medium text-slate-500"
            title={item.label}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
