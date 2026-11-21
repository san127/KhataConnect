import {
  allocateOldestFirst, formatINR, fromPaise, lineSubtotal, purchaseTotal, remainingBalance, sumAllocations, toPaise,
} from '../src/utils/money';

describe('money', () => {
  it('converts rupees to paise without float drift', () => {
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(toPaise('19.99')).toBe(1999);
    expect(fromPaise(1999)).toBe(19.99);
  });

  it('formats INR with Indian digit grouping', () => {
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(999)).toBe('₹999');
    expect(formatINR(1000)).toBe('₹1,000');
    expect(formatINR(123456)).toBe('₹1,23,456');
    expect(formatINR(12345678.5)).toBe('₹1,23,45,678.50');
    expect(formatINR(-2500)).toBe('-₹2,500');
    expect(formatINR(10, { decimals: true })).toBe('₹10.00');
  });

  it('computes itemised totals as sum of quantity x price', () => {
    expect(lineSubtotal({ quantity: 2.5, unit_price: 40 })).toBe(100);
    expect(purchaseTotal([
      { item_name: 'Rice', quantity: 2, unit_price: 60.5 },
      { item_name: 'Oil', quantity: 1, unit_price: 150 },
      { item_name: 'Salt', quantity: 3, unit_price: 0.1 },
    ])).toBe(271.3);
    expect(purchaseTotal([])).toBe(0);
  });

  describe('allocateOldestFirst', () => {
    const bills = [
      { id: 'b2', remaining: 300, createdAt: '2026-02-01' },
      { id: 'b1', remaining: 200, createdAt: '2026-01-01' },
      { id: 'b3', remaining: 100, createdAt: '2026-03-01' },
    ];
    it('pays the oldest bill first and spills over', () => {
      expect(allocateOldestFirst(350, bills)).toEqual([
        { transaction_id: 'b1', amount: 200 },
        { transaction_id: 'b2', amount: 150 },
      ]);
    });
    it('can prioritise a targeted bill', () => {
      expect(allocateOldestFirst(250, bills, 'b3')).toEqual([
        { transaction_id: 'b3', amount: 100 },
        { transaction_id: 'b1', amount: 150 },
      ]);
    });
    it('allocations always sum to the payment', () => {
      expect(sumAllocations(allocateOldestFirst(333.33, bills))).toBe(333.33);
    });
    it('skips settled bills and rejects overpayment', () => {
      expect(allocateOldestFirst(50, [{ id: 'x', remaining: 0, createdAt: '1' }, { id: 'y', remaining: 80, createdAt: '2' }]))
        .toEqual([{ transaction_id: 'y', amount: 50 }]);
      expect(() => allocateOldestFirst(601, bills)).toThrow(/exceeds/);
    });
  });

  it('only RECEIVED payments reduce the balance', () => {
    expect(remainingBalance(500, [
      { status: 'PENDING', allocated: 200 },
      { status: 'REJECTED', allocated: 100 },
      { status: 'RECEIVED', allocated: 150 },
    ])).toBe(350);
  });
});
