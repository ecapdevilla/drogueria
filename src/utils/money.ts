const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const cop = (n: number) => fmt.format(Math.round(n));
export const copInt = (n: number) => Math.round(n);