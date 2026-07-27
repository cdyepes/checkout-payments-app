import {
  detectCardBrand,
  formatCardNumber,
  formatExpiryInput,
  isValidCardNumber,
  isValidExpiry,
  normalizeCardNumber,
  parseExpiry,
  passesLuhnCheck,
} from './card';

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

  it('truncates beyond 19 digits', () => {
    expect(formatCardNumber('4242424242424242123456')).toBe('4242 4242 4242 4242 123');
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
  it('accepts a valid 16-digit card number', () => {
    expect(isValidCardNumber('4242 4242 4242 4242')).toBe(true);
  });

  it('rejects a number that is too short', () => {
    expect(isValidCardNumber('4242 4242')).toBe(false);
  });

  it('rejects a number that fails the Luhn check', () => {
    expect(isValidCardNumber('4242424242424241')).toBe(false);
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
