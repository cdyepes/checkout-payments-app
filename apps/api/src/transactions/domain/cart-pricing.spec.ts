import { BASE_FEE_IN_CENTS, DELIVERY_FEE_IN_CENTS } from './fees';
import { priceCart } from './cart-pricing';

describe('priceCart', () => {
  it('prices a single line', () => {
    const priced = priceCart([{ productId: 'product-1', quantity: 2, unitPriceInCents: 100_000 }]);

    expect(priced.items).toEqual([
      { productId: 'product-1', quantity: 2, unitPriceInCents: 100_000, subtotalInCents: 200_000 },
    ]);
    expect(priced.productAmountInCents).toBe(200_000);
    expect(priced.totalAmountInCents).toBe(200_000 + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS);
  });

  it('sums subtotals across multiple lines', () => {
    const priced = priceCart([
      { productId: 'product-1', quantity: 2, unitPriceInCents: 100_000 },
      { productId: 'product-2', quantity: 3, unitPriceInCents: 50_000 },
      { productId: 'product-3', quantity: 1, unitPriceInCents: 25_000 },
    ]);

    // 200_000 + 150_000 + 25_000
    expect(priced.productAmountInCents).toBe(375_000);
    expect(priced.totalAmountInCents).toBe(375_000 + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS);
  });

  it('charges the flat fees exactly once, regardless of how many lines are in the cart', () => {
    const single = priceCart([{ productId: 'product-1', quantity: 1, unitPriceInCents: 100_000 }]);
    const multi = priceCart([
      { productId: 'product-1', quantity: 1, unitPriceInCents: 100_000 },
      { productId: 'product-2', quantity: 1, unitPriceInCents: 100_000 },
      { productId: 'product-3', quantity: 1, unitPriceInCents: 100_000 },
    ]);

    expect(single.baseFeeInCents).toBe(BASE_FEE_IN_CENTS);
    expect(single.deliveryFeeInCents).toBe(DELIVERY_FEE_IN_CENTS);
    expect(multi.baseFeeInCents).toBe(BASE_FEE_IN_CENTS);
    expect(multi.deliveryFeeInCents).toBe(DELIVERY_FEE_IN_CENTS);
  });

  it('returns a zero product amount for an empty cart, with only the flat fees in the total', () => {
    const priced = priceCart([]);

    expect(priced.items).toEqual([]);
    expect(priced.productAmountInCents).toBe(0);
    expect(priced.totalAmountInCents).toBe(BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS);
  });
});
