import { Product as PrismaProduct } from '@prisma/client';
import { ProductMapper } from './product.mapper';

describe('ProductMapper', () => {
  it('maps a Prisma row to a domain Product', () => {
    const row: PrismaProduct = {
      id: 'product-1',
      name: 'Keyboard',
      description: 'A keyboard',
      imageUrl: 'https://example.com/keyboard.jpg',
      priceInCents: 10000,
      currency: 'COP',
      stock: 5,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const product = ProductMapper.toDomain(row);

    expect(product.id).toBe(row.id);
    expect(product.name).toBe(row.name);
    expect(product.description).toBe(row.description);
    expect(product.imageUrl).toBe(row.imageUrl);
    expect(product.priceInCents).toBe(row.priceInCents);
    expect(product.currency).toBe(row.currency);
    expect(product.stock).toBe(row.stock);
  });
});
