export type CardBrand = 'visa' | 'mastercard' | 'unknown';

export function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCardNumber(value: string): string {
  return normalizeCardNumber(value).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

export function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function detectCardBrand(value: string): CardBrand {
  const digits = normalizeCardNumber(value);
  if (digits.length === 0) return 'unknown';
  if (digits.startsWith('4')) return 'visa';

  const prefix2 = Number(digits.slice(0, 2));
  const prefix4 = Number(digits.slice(0, 4));
  if (prefix2 >= 51 && prefix2 <= 55) return 'mastercard';
  if (prefix4 >= 2221 && prefix4 <= 2720) return 'mastercard';

  return 'unknown';
}

export function passesLuhnCheck(value: string): boolean {
  const digits = normalizeCardNumber(value);
  if (digits.length === 0) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function isValidCardNumber(value: string): boolean {
  const digits = normalizeCardNumber(value);
  return digits.length >= 13 && digits.length <= 19 && passesLuhnCheck(digits);
}

const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/(\d{2})$/;

export function parseExpiry(value: string): { month: string; year: string } | null {
  const match = EXPIRY_PATTERN.exec(value);
  if (!match) return null;
  return { month: match[1]!, year: match[2]! };
}

export function isValidExpiry(value: string, now: Date = new Date()): boolean {
  const parsed = parseExpiry(value);
  if (!parsed) return false;

  const month = Number(parsed.month);
  const year = 2000 + Number(parsed.year);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
}
