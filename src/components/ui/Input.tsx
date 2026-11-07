import React, { forwardRef, InputHTMLAttributes, useId } from 'react';
import { ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = '', id, icon, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors"
          >
            {icon}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-10 w-full rounded-xl border bg-white text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
            icon ? 'pl-10 pr-3' : 'px-3'
          } ${
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-400/40'
              : 'border-slate-200 focus:border-brand-400'
          } ${className}`}
          {...props}
        />
      </div>
      {error && (
        <span id={errorId} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </div>
  );
});
