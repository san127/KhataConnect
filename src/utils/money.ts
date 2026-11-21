// Money helpers. All arithmetic is done in integer paise to avoid floating-point drift.
// The server (Postgres NUMERIC) is the source of truth; these mirror its rules for previews and tests.
export const toPaise = (rupees: number | string): number => Math.round(Number(rupees) * 100);
export const fromPaise = (paise: number): number => paise / 100;

export function formatINR(amount: number, opts: { decimals?: boolean } = {}): string {
  const paise = Math.round(amount * 100);
  const neg = paise < 0;
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100).toString();
  const frac = (abs % 100).toString().padStart(2, '0');
  // Indian digit grouping: last 3, then pairs
  let grouped = whole;
  if (whole.length > 3) {
    const last3 = whole.slice(-3);
    const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    grouped = `${rest},${last3}`;
  }
  const showDecimals = opts.decimals ?? frac !== '00';
  return `${neg ? '-' : ''}₹${grouped}${showDecimals ? `.${frac}` : ''}`;
}

export interface DraftItem { item_name: string; quantity: number; unit_price: number }

export const lineSubtotal = (i: Pick<DraftItem, 'quantity' | 'unit_price'>): number =>
  fromPaise(Math.round(i.quantity * toPaise(i.unit_price)));

export const purchaseTotal = (items: DraftItem[]): number =>
  fromPaise(items.reduce((s, i) => s + Math.round(i.quantity * toPaise(i.unit_price)), 0));

export interface OpenBill { id: string; remaining: number; createdAt: string }
export interface Allocation { transaction_id: string; amount: number }

/** Default allocation: oldest unpaid bill first (optionally a targeted bill first). Throws if it can't fit. */
export function allocateOldestFirst(paymentAmount: number, bills: OpenBill[], targetId?: string | null): Allocation[] {
  let left = toPaise(paymentAmount);
  const ordered = [...bills].sort((a, b) => {
    if (targetId) {
      if (a.id === targetId && b.id !== targetId) return -1;
      if (b.id === targetId && a.id !== targetId) return 1;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
  const out: Allocation[] = [];
  for (const b of ordered) {
    if (left <= 0) break;
    const rem = toPaise(b.remaining);
    if (rem <= 0) continue;
    const take = Math.min(left, rem);
    out.push({ transaction_id: b.id, amount: fromPaise(take) });
    left -= take;
  }
  if (left > 0) throw new Error('Payment exceeds the outstanding balance');
  return out;
}

export const sumAllocations = (a: Allocation[]): number => fromPaise(a.reduce((s, x) => s + toPaise(x.amount), 0));

/** remaining = total - verified allocations. Pending/rejected payments never reduce it. */
export function remainingBalance(total: number, payments: { status: 'PENDING' | 'RECEIVED' | 'REJECTED'; allocated: number }[]): number {
  const paid = payments.filter(p => p.status === 'RECEIVED').reduce((s, p) => s + toPaise(p.allocated), 0);
  return fromPaise(toPaise(total) - paid);
}
