import {
  detectCardBrand,
  formatCardNumber,
  formatExpiryInput,
  isValidCardNumber,
  isValidExpiry,
  maxDigitsForBrand,
  maxFormattedLength,
  normalizeCardNumber,
  parseExpiry,
  passesLuhnCheck,
} from './card';

// Real, widely-documented test PANs, all Luhn-valid.
const VISA_13 = '4222222222222';
const MASTERCARD_16 = '5105105105105100';
// Constructed (not a real issued number) purely to exercise the 19-digit Visa
// branch: '4' + 17 zeros + a computed Luhn check digit.
const VISA_19 = `4${'0'.repeat(17)}6`;
// Same construction at 14 digits — not one of Visa's valid lengths (13/16/19) —
// to prove length is checked independently of the Luhn digit sum.
const VISA_14_LUHN_VALID = `4${'0'.repeat(12)}2`;
// Constructed the same way, but with a Mastercard prefix, to prove a 19-digit
// number is rejected by length even when Luhn passes — Mastercard is always 16.
const MASTERCARD_19_LUHN_VALID = `51${'0'.repeat(16)}3`;

describe('normalizeCardNumber', () => {
  it('strips everything but digits', () => {
    expect(normalizeCardNumber('4242 4242-4242 4242')).toBe('4242424242424242');
  });
});

describe('formatCardNumber', () => {
  it('groups digits into blocks of four', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
  });

  it('formats a partial number without a trailing space', () => {
    expect(formatCardNumber('42424')).toBe('4242 4');
  });

  it('truncates a Visa number at 19 digits', () => {
    expect(formatCardNumber('4242424242424242123456')).toBe('4242 4242 4242 4242 123');
  });

  it('truncates a Mastercard number at 16 digits, even if more were typed', () => {
    expect(formatCardNumber(`${MASTERCARD_16}1234567`)).toBe('5105 1051 0510 5100');
  });
});

describe('maxDigitsForBrand', () => {
  it('is 19 for visa (13, 16 or 19-digit cards)', () => {
    expect(maxDigitsForBrand('visa')).toBe(19);
  });

  it('is 16 for mastercard (always 16 digits)', () => {
    expect(maxDigitsForBrand('mastercard')).toBe(16);
  });

  it('is 19 for an unrecognized brand (keeps the permissive range)', () => {
    expect(maxDigitsForBrand('unknown')).toBe(19);
  });
});

describe('maxFormattedLength', () => {
  it('accounts for the grouping spaces on top of the digit count', () => {
    expect(maxFormattedLength('mastercard')).toBe(19); // 16 digits + 3 spaces
    expect(maxFormattedLength('visa')).toBe(23); // 19 digits + 4 spaces
  });
});

describe('formatExpiryInput', () => {
  it('passes through 0-2 digits unchanged', () => {
    expect(formatExpiryInput('1')).toBe('1');
    expect(formatExpiryInput('12')).toBe('12');
  });

  it('inserts a slash after the second digit', () => {
    expect(formatExpiryInput('123')).toBe('12/3');
    expect(formatExpiryInput('1229')).toBe('12/29');
  });

  it('strips non-digit characters and caps at 4 digits', () => {
    expect(formatExpiryInput('12/29/99')).toBe('12/29');
  });
});

describe('detectCardBrand', () => {
  it('returns unknown for an empty value', () => {
    expect(detectCardBrand('')).toBe('unknown');
  });

  it('detects Visa from the 4 prefix', () => {
    expect(detectCardBrand('4242424242424242')).toBe('visa');
  });

  it('detects Mastercard from the classic 51-55 range', () => {
    expect(detectCardBrand('5105105105105100')).toBe('mastercard');
  });

  it('detects Mastercard from the newer 2221-2720 range', () => {
    expect(detectCardBrand('2223000048400011')).toBe('mastercard');
  });

  it('returns unknown for an unrecognized prefix', () => {
    expect(detectCardBrand('6011000000000004')).toBe('unknown');
  });
});

describe('passesLuhnCheck', () => {
  it('accepts a valid Visa test number', () => {
    expect(passesLuhnCheck('4242424242424242')).toBe(true);
  });

  it('rejects a number with a corrupted digit', () => {
    expect(passesLuhnCheck('4242424242424241')).toBe(false);
  });

  it('rejects an empty value', () => {
    expect(passesLuhnCheck('')).toBe(false);
  });
});

describe('isValidCardNumber', () => {
  it('accepts a valid 16-digit Visa card number', () => {
    expect(isValidCardNumber('4242 4242 4242 4242')).toBe(true);
  });

  it('rejects a number that is too short', () => {
    expect(isValidCardNumber('4242 4242')).toBe(false);
  });

  it('rejects a number that fails the Luhn check', () => {
    expect(isValidCardNumber('4242424242424241')).toBe(false);
  });

  it('accepts a 13-digit Visa card number', () => {
    expect(isValidCardNumber(VISA_13)).toBe(true);
  });

  it('accepts a 19-digit Visa card number', () => {
    expect(isValidCardNumber(VISA_19)).toBe(true);
  });

  it("rejects a 14-digit Visa number (not one of Visa's valid lengths), even though Luhn passes", () => {
    expect(passesLuhnCheck(VISA_14_LUHN_VALID)).toBe(true);
    expect(isValidCardNumber(VISA_14_LUHN_VALID)).toBe(false);
  });

  it('accepts a 16-digit Mastercard card number', () => {
    expect(isValidCardNumber(MASTERCARD_16)).toBe(true);
  });

  it('rejects a 19-digit Mastercard number — Mastercard is always 16 — even though Luhn passes', () => {
    expect(passesLuhnCheck(MASTERCARD_19_LUHN_VALID)).toBe(true);
    expect(isValidCardNumber(MASTERCARD_19_LUHN_VALID)).toBe(false);
  });
});

describe('parseExpiry', () => {
  it('parses a well-formed MM/YY value', () => {
    expect(parseExpiry('09/29')).toEqual({ month: '09', year: '29' });
  });

  it('returns null for a malformed value', () => {
    expect(parseExpiry('13/29')).toBeNull();
    expect(parseExpiry('9/29')).toBeNull();
    expect(parseExpiry('09-29')).toBeNull();
  });
});

describe('isValidExpiry', () => {
  const now = new Date('2026-07-26T00:00:00.000Z');

  it('accepts a future month in the current year', () => {
    expect(isValidExpiry('12/26', now)).toBe(true);
  });

  it('accepts the current month', () => {
    expect(isValidExpiry('07/26', now)).toBe(true);
  });

  it('rejects a past month in the current year', () => {
    expect(isValidExpiry('06/26', now)).toBe(false);
  });

  it('rejects a past year', () => {
    expect(isValidExpiry('12/25', now)).toBe(false);
  });

  it('rejects a malformed value', () => {
    expect(isValidExpiry('nope', now)).toBe(false);
  });
});
