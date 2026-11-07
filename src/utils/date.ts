export function iso(date?: Date): string {
  return (date ?? new Date()).toISOString();
}

function formatLocalDate(date: Date): string {
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  return formatLocalDate(d);
}

/**
 * Formatea una fecha sin hora (`YYYY-MM-DD`) como fecha local.
 * Evita que `new Date('2026-11-05')` se interprete como UTC y muestre el día anterior.
 */
export function formatDateOnly(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return formatDate(value);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (isNaN(date.getTime())) return '';
  return formatLocalDate(date);
}

export function daysUntil(isoStr: string): number {
  const d = new Date(isoStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

export function isExpired(isoStr: string): boolean {
  return daysUntil(isoStr) <= 0;
}
