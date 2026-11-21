export const toISODate = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const addDays = (d: Date, n: number): Date => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const fmtDate = (iso?: string | null): string =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';
export const isOverdue = (due?: string | null): boolean => !!due && due < toISODate(new Date());
export const daysUntil = (due: string): number =>
  Math.round((new Date(`${due}T00:00:00`).getTime() - new Date(`${toISODate(new Date())}T00:00:00`).getTime()) / 86400000);
