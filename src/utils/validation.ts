import { z } from 'zod';

export const emailSchema = z.string().trim().email('Enter a valid email address');
// Indian mobile: optional +91 / 0, then 10 digits starting 6-9. Normalised to E.164.
export const normalizePhone = (raw: string): string | null => {
  const d = raw.replace(/[\s()-]/g, '');
  const m = d.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  return m ? `+91${m[1]}` : null;
};
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
export const phoneField = z.string().trim().refine(v => normalizePhone(v) !== null, 'Enter a valid 10-digit mobile number');

export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Za-z]/, 'Include a letter')
  .regex(/\d/, 'Include a number');

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Enter your full name'),
    email: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine(v => !!v.email || !!v.phone, { message: 'Enter an email or a phone number', path: ['email'] })
  .refine(v => !v.email || isEmail(v.email), { message: 'Enter a valid email address', path: ['email'] })
  .refine(v => !v.phone || normalizePhone(v.phone) !== null, { message: 'Enter a valid 10-digit mobile number', path: ['phone'] })
  .refine(v => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or phone').refine(
    v => isEmail(v) || normalizePhone(v) !== null, 'Enter a valid email or 10-digit mobile number'),
  password: z.string().min(1, 'Enter your password'),
});

export const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine(v => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export const otpSchema = z.object({ token: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') });

export const shopSchema = z.object({
  shop_name: z.string().trim().min(2, 'Enter the shop name'),
  owner_name: z.string().trim().min(2, 'Enter the owner name'),
  contact_phone: phoneField,
  category: z.string().trim().min(1, 'Choose a category'),
  address: z.string().trim().min(5, 'Enter the shop address'),
  description: z.string().trim().max(300).optional(),
});

export const shopCodeSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^KH-[A-Z0-9]{3,10}$/, 'Codes look like KH-SAI102'),
});

export const itemSchema = z.object({
  item_name: z.string().trim().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be more than 0'),
  unit_price: z.number().min(0, 'Price cannot be negative'),
});

export const amountSchema = (max: number) =>
  z.number().positive('Enter an amount').max(max, `Cannot exceed outstanding balance`);
