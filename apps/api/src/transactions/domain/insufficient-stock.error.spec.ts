import { InsufficientStockError } from './insufficient-stock.error';

describe('InsufficientStockError', () => {
  it('carries the product id, requested and available quantities in the message', () => {
    const error = new InsufficientStockError('product-1', 5, 2);

    expect(error.code).toBe('CONFLICT');
    expect(error.productId).toBe('product-1');
    expect(error.requested).toBe(5);
    expect(error.available).toBe(2);
    expect(error.message).toBe(
      'Product "product-1" has 2 unit(s) available, but 5 were requested',
    );
  });
});
