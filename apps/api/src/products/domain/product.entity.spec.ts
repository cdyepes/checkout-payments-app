import { Product } from './product.entity';

function buildProduct(overrides: Partial<Parameters<typeof Product.fromPersistence>[0]> = {}) {
  return Product.fromPersistence({
    id: 'product-1',
    name: 'Keyboard',
    description: 'A keyboard',
    imageUrl: 'https://example.com/keyboard.jpg',
    priceInCents: 10000,
    currency: 'COP',
    stock: 5,
    ...overrides,
  });
}

describe('Product', () => {
  it('exposes its persisted properties', () => {
    const product = buildProduct();

    expect(product.id).toBe('product-1');
    expect(product.name).toBe('Keyboard');
    expect(product.description).toBe('A keyboard');
    expect(product.imageUrl).toBe('https://example.com/keyboard.jpg');
    expect(product.priceInCents).toBe(10000);
    expect(product.currency).toBe('COP');
    expect(product.stock).toBe(5);
  });

  describe('hasStockFor', () => {
    it('returns true when stock covers the requested quantity', () => {
      const product = buildProduct({ stock: 5 });
      expect(product.hasStockFor(5)).toBe(true);
      expect(product.hasStockFor(3)).toBe(true);
    });

    it('returns false when stock is insufficient', () => {
      const product = buildProduct({ stock: 2 });
      expect(product.hasStockFor(3)).toBe(false);
    });

    it('returns false for a zero or negative quantity', () => {
      const product = buildProduct({ stock: 5 });
      expect(product.hasStockFor(0)).toBe(false);
      expect(product.hasStockFor(-1)).toBe(false);
    });
  });
});
