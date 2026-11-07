import React, { ReactNode } from 'react';

interface KPIProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  tone?: 'brand' | 'emerald' | 'rose' | 'amber' | 'slate';
  hint?: string;
}

const TONES = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-700',
  rose: 'bg-rose-50 text-rose-600',
  amber: 'bg-amber-50 text-amber-600',
  slate: 'bg-slate-100 text-slate-600',
};

const TONES_BAR = {
  brand: 'from-brand-500 to-brand-300',
  emerald: 'from-emerald-500 to-emerald-300',
  rose: 'from-rose-500 to-rose-300',
  amber: 'from-amber-500 to-amber-300',
  slate: 'from-slate-400 to-slate-200',
};

export function KPI({ label, value, change, icon, tone = 'brand', hint }: KPIProps) {
  return (
    <div className="card card-hover relative overflow-hidden p-5">
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${TONES_BAR[tone]}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 truncate font-display text-[1.35rem] font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}
        >
          {icon ?? <span className="text-lg">📊</span>}
        </div>
      </div>

      {change !== undefined ? (
        <div
          className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {change >= 0 ? '▲' : '▼'} {Math.abs(change)}%
        </div>
      ) : (
        hint && <p className="mt-3 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}
