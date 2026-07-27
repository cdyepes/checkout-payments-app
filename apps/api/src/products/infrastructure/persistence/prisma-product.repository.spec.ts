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

function buildPrisma(client: Record<string, unknown>): PrismaService {
  return { client: () => client } as unknown as PrismaService;
}

describe('PrismaProductRepository', () => {
  it('findAll() maps every row to a domain Product', async () => {
    const prisma = buildPrisma({
      product: { findMany: jest.fn().mockResolvedValue([buildRow(), buildRow({ id: 'product-2' })]) },
    });
    const repository = new PrismaProductRepository(prisma);

    const result = await repository.findAll();

    expect(result.isOk()).toBe(true);
    const products = result._unsafeUnwrap();
    expect(products).toHaveLength(2);
    expect(products[0]?.id).toBe('product-1');
  });

  it('findAll() wraps a Prisma failure in UnexpectedError', async () => {
    const prisma = buildPrisma({
      product: { findMany: jest.fn().mockRejectedValue(new Error('connection lost')) },
    });
    const repository = new PrismaProductRepository(prisma);

    const result = await repository.findAll();

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
  });

  it('findById() returns null when no row matches', async () => {
    const prisma = buildPrisma({
      product: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    const repository = new PrismaProductRepository(prisma);

    const result = await repository.findById('missing');

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBeNull();
  });

  it('findById() maps a matching row to a domain Product', async () => {
    const prisma = buildPrisma({
      product: { findUnique: jest.fn().mockResolvedValue(buildRow()) },
    });
    const repository = new PrismaProductRepository(prisma);

    const result = await repository.findById('product-1');

    expect(result._unsafeUnwrap()?.id).toBe('product-1');
  });

  it('decrementStock() returns true and issues a conditional update when enough stock is available', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = buildPrisma({ product: { updateMany } });
    const repository = new PrismaProductRepository(prisma);

    const result = await repository.decrementStock('product-1', 2);

    expect(result._unsafeUnwrap()).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'product-1', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
  });

  it('decrementStock() returns false when there is not enough stock', async () => {
    const prisma = buildPrisma({
      product: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    });
    const repository = new PrismaProductRepository(prisma);

    const result = await repository.decrementStock('product-1', 99);

    expect(result._unsafeUnwrap()).toBe(false);
  });

  it('decrementStock() wraps a Prisma failure in UnexpectedError', async () => {
    const prisma = buildPrisma({
      product: { updateMany: jest.fn().mockRejectedValue(new Error('connection lost')) },
    });
    const repository = new PrismaProductRepository(prisma);

    const result = await repository.decrementStock('product-1', 1);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
  });
});
