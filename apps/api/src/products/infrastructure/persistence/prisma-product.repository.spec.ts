import { Product as PrismaProduct } from '@prisma/client';
import { UnexpectedError } from '../../../shared/domain/domain-error';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { PrismaProductRepository } from './prisma-product.repository';

function buildRow(overrides: Partial<PrismaProduct> = {}): PrismaProduct {
  return {
    id: 'product-1',
    name: 'Keyboard',
    description: 'A keyboard',
    imageUrl: 'https://example.com/keyboard.jpg',
    priceInCents: 10000,
    currency: 'COP',
    stock: 5,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PrismaProductRepository', () => {
  it('findAll() maps every row to a domain Product', async () => {
    const prisma = {
      product: { findMany: jest.fn().mockResolvedValue([buildRow(), buildRow({ id: 'product-2' })]) },
    } as unknown as PrismaService;
    const repository = new PrismaProductRepository(prisma);

    const result = await repository.findAll();

    expect(result.isOk()).toBe(true);
    const products = result._unsafeUnwrap();
    expect(products).toHaveLength(2);
    expect(products[0]?.id).toBe('product-1');
  });

  it('findAll() wraps a Prisma failure in UnexpectedError', async () => {
    const prisma = {
      product: { findMany: jest.fn().mockRejectedValue(new Error('connection lost')) },
    } as unknown as PrismaService;
    const repository = new PrismaProductRepository(prisma);

    const result = await repository.findAll();

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
  });

  it('findById() returns null when no row matches', async () => {
    const prisma = {
      product: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const repository = new PrismaProductRepository(prisma);

    const result = await repository.findById('missing');

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBeNull();
  });

  it('findById() maps a matching row to a domain Product', async () => {
    const prisma = {
      product: { findUnique: jest.fn().mockResolvedValue(buildRow()) },
    } as unknown as PrismaService;
    const repository = new PrismaProductRepository(prisma);

    const result = await repository.findById('product-1');

    expect(result._unsafeUnwrap()?.id).toBe('product-1');
  });
});
