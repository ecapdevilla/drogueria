export function iso(date?: Date): string {
  return (date ?? new Date()).toISOString();
}

export function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function daysUntil(isoStr: string): number {
  const d = new Date(isoStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

export function isExpired(isoStr: string): boolean {
  return daysUntil(isoStr) <= 0;
}