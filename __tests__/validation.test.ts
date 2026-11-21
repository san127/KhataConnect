import { amountSchema, isEmail, itemSchema, normalizePhone, otpSchema, passwordSchema } from '../src/utils/validation';

describe('validation', () => {
  it('normalises Indian mobile numbers to E.164', () => {
    expect(normalizePhone('98765 43210')).toBe('+919876543210');
    expect(normalizePhone('+91-98765-43210')).toBe('+919876543210');
    expect(normalizePhone('09876543210')).toBe('+919876543210');
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('5876543210')).toBeNull();
  });

  it('detects emails', () => {
    expect(isEmail(' a@b.in ')).toBe(true);
    expect(isEmail('9876543210')).toBe(false);
  });

  it('enforces password rules', () => {
    expect(passwordSchema.safeParse('abc12345').success).toBe(true);
    expect(passwordSchema.safeParse('short1').success).toBe(false);
    expect(passwordSchema.safeParse('onlyletters').success).toBe(false);
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
  });

  it('validates OTP, items and payment amounts', () => {
    expect(otpSchema.safeParse({ token: '123456' }).success).toBe(true);
    expect(otpSchema.safeParse({ token: '12345' }).success).toBe(false);
    expect(itemSchema.safeParse({ item_name: 'Tea', quantity: 1, unit_price: 0 }).success).toBe(true);
    expect(itemSchema.safeParse({ item_name: ' ', quantity: 1, unit_price: 5 }).success).toBe(false);
    expect(itemSchema.safeParse({ item_name: 'Tea', quantity: 0, unit_price: 5 }).success).toBe(false);
    expect(amountSchema(100).safeParse(100).success).toBe(true);
    expect(amountSchema(100).safeParse(100.01).success).toBe(false);
    expect(amountSchema(100).safeParse(0).success).toBe(false);
  });
});
