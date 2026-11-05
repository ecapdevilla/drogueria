import React from 'react';

interface KPIProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: string;
}

export function KPI({ label, value, change, icon = '📊' }: KPIProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-800">{value}</div>
      {change !== undefined && (
        <div className={`text-xs mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
        </div>
      )}
    </div>
  );
}