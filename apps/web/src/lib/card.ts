export type CardBrand = 'visa' | 'mastercard' | 'unknown';

export function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, '');
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

// Visa issues 13, 16 and 19-digit cards; Mastercard is always 16. A brand we
// can't identify from the prefix keeps the old permissive 13-19 range so an
// unrecognized-but-real card (Amex, Discover, ...) isn't wrongly rejected.
const VALID_LENGTHS_BY_BRAND: Record<CardBrand, readonly number[]> = {
  visa: [13, 16, 19],
  mastercard: [16],
  unknown: [13, 14, 15, 16, 17, 18, 19],
};

export function maxDigitsForBrand(brand: CardBrand): number {
  return Math.max(...VALID_LENGTHS_BY_BRAND[brand]);
}

// The formatted (grouped-with-spaces) input length for a brand's longest valid
// card number — e.g. 16 digits -> "4242 4242 4242 4242" is 19 characters.
export function maxFormattedLength(brand: CardBrand): number {
  const digits = maxDigitsForBrand(brand);
  return digits + Math.floor((digits - 1) / 4);
}

export function formatCardNumber(value: string): string {
  const digits = normalizeCardNumber(value);
  const brand = detectCardBrand(digits);
  return digits.slice(0, maxDigitsForBrand(brand)).replace(/(.{4})/g, '$1 ').trim();
}

export function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
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
  const brand = detectCardBrand(digits);
  return VALID_LENGTHS_BY_BRAND[brand].includes(digits.length) && passesLuhnCheck(digits);
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
