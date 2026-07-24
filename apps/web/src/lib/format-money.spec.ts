import { formatMoney } from './format-money';

describe('formatMoney', () => {
  it('formats cents as whole-unit COP currency', () => {
    const formatted = formatMoney(32900000, 'COP');
    expect(formatted).toContain('329.000');
  });

  it('rounds down to zero decimals', () => {
    const formatted = formatMoney(150, 'COP');
    expect(formatted).not.toMatch(/,\d{2}$/);
  });
});
