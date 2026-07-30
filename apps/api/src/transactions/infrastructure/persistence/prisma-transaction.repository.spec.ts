import { UnexpectedError } from '../../../shared/domain/domain-error';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { PrismaTransactionRepository } from './prisma-transaction.repository';
import { TransactionRow } from './transaction.mapper';

const TRANSACTION_INCLUDE = { items: { orderBy: { productId: 'asc' } } };

function buildRow(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 'transaction-1',
    reference: 'ref-1',
    status: 'PENDING',
    customerId: 'customer-1',
    items: [
      {
        id: 'item-1',
        transactionId: 'transaction-1',
        productId: 'product-1',
        quantity: 2,
        unitPriceInCents: 100_000,
        subtotalInCents: 200_000,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ],
    productAmountInCents: 200_000,
    baseFeeInCents: 500_000,
    deliveryFeeInCents: 800_000,
    totalAmountInCents: 1_500_000,
    currency: 'COP',
    providerTransactionId: null,
    providerStatus: null,
    failureReason: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function buildPrisma(client: Record<string, unknown>): PrismaService {
  return { client: () => client } as unknown as PrismaService;
}

describe('PrismaTransactionRepository', () => {
  it('findById() returns null when no row matches', async () => {
    const prisma = buildPrisma({ transaction: { findUnique: jest.fn().mockResolvedValue(null) } });
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.findById('missing');

    expect(result._unsafeUnwrap()).toBeNull();
  });

  it('findById() maps a matching row, including its items', async () => {
    const findUnique = jest.fn().mockResolvedValue(buildRow());
    const prisma = buildPrisma({ transaction: { findUnique } });
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.findById('transaction-1');

    expect(result._unsafeUnwrap()?.id).toBe('transaction-1');
    expect(result._unsafeUnwrap()?.items).toEqual([
      { productId: 'product-1', quantity: 2, unitPriceInCents: 100_000, subtotalInCents: 200_000 },
    ]);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'transaction-1' },
      include: TRANSACTION_INCLUDE,
    });
  });

  it('findById() wraps a Prisma failure', async () => {
    const prisma = buildPrisma({
      transaction: { findUnique: jest.fn().mockRejectedValue(new Error('down')) },
    });
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.findById('transaction-1');

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
  });

  it('create() persists a nested items write and maps the created row', async () => {
    const create = jest.fn().mockResolvedValue(buildRow({ id: 'transaction-2' }));
    const prisma = buildPrisma({ transaction: { create } });
    const repository = new PrismaTransactionRepository(prisma);
    const props = {
      reference: 'ref-2',
      status: 'PENDING' as const,
      customerId: 'customer-1',
      items: [
        { productId: 'product-1', quantity: 2, unitPriceInCents: 100_000, subtotalInCents: 200_000 },
      ],
      productAmountInCents: 200_000,
      baseFeeInCents: 500_000,
      deliveryFeeInCents: 800_000,
      totalAmountInCents: 1_500_000,
      currency: 'COP',
      providerTransactionId: null,
      providerStatus: null,
      failureReason: null,
    };

    const result = await repository.create(props);

    expect(result._unsafeUnwrap().id).toBe('transaction-2');
    expect(create).toHaveBeenCalledWith({
      data: {
        reference: 'ref-2',
        status: 'PENDING',
        customerId: 'customer-1',
        productAmountInCents: 200_000,
        baseFeeInCents: 500_000,
        deliveryFeeInCents: 800_000,
        totalAmountInCents: 1_500_000,
        currency: 'COP',
        providerTransactionId: null,
        providerStatus: null,
        failureReason: null,
        items: {
          create: [
            { productId: 'product-1', quantity: 2, unitPriceInCents: 100_000, subtotalInCents: 200_000 },
          ],
        },
      },
      include: TRANSACTION_INCLUDE,
    });
  });

  it('create() issues one nested create per line for a multi-item cart', async () => {
    const create = jest.fn().mockResolvedValue(buildRow({ id: 'transaction-3' }));
    const prisma = buildPrisma({ transaction: { create } });
    const repository = new PrismaTransactionRepository(prisma);

    await repository.create({
      reference: 'ref-3',
      status: 'PENDING',
      customerId: 'customer-1',
      items: [
        { productId: 'product-1', quantity: 1, unitPriceInCents: 100_000, subtotalInCents: 100_000 },
        { productId: 'product-2', quantity: 2, unitPriceInCents: 50_000, subtotalInCents: 100_000 },
      ],
      productAmountInCents: 200_000,
      baseFeeInCents: 500_000,
      deliveryFeeInCents: 800_000,
      totalAmountInCents: 1_500_000,
      currency: 'COP',
      providerTransactionId: null,
      providerStatus: null,
      failureReason: null,
    });

    const callArgs = create.mock.calls[0]![0];
    expect(callArgs.data.items.create).toHaveLength(2);
  });

  it('create() wraps a Prisma failure', async () => {
    const prisma = buildPrisma({
      transaction: { create: jest.fn().mockRejectedValue(new Error('constraint violation')) },
    });
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.create({
      reference: 'ref-2',
      status: 'PENDING',
      customerId: 'customer-1',
      items: [
        { productId: 'product-1', quantity: 2, unitPriceInCents: 100_000, subtotalInCents: 200_000 },
      ],
      productAmountInCents: 200_000,
      baseFeeInCents: 500_000,
      deliveryFeeInCents: 800_000,
      totalAmountInCents: 1_500_000,
      currency: 'COP',
      providerTransactionId: null,
      providerStatus: null,
      failureReason: null,
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
  });

  it('updateStatus() persists and maps the updated row, including its items', async () => {
    const update = jest.fn().mockResolvedValue(buildRow({ status: 'APPROVED' }));
    const prisma = buildPrisma({ transaction: { update } });
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.updateStatus('transaction-1', {
      status: 'APPROVED',
      providerStatus: 'APPROVED',
      providerTransactionId: 'gw-tx-1',
      failureReason: null,
    });

    expect(result._unsafeUnwrap().status).toBe('APPROVED');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'transaction-1' },
      data: {
        status: 'APPROVED',
        providerStatus: 'APPROVED',
        providerTransactionId: 'gw-tx-1',
        failureReason: null,
      },
      include: TRANSACTION_INCLUDE,
    });
  });

  it('updateStatus() wraps a Prisma failure', async () => {
    const prisma = buildPrisma({
      transaction: { update: jest.fn().mockRejectedValue(new Error('not found')) },
    });
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.updateStatus('transaction-1', {
      status: 'ERROR',
      providerStatus: null,
      providerTransactionId: null,
      failureReason: 'timeout',
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
  });

  it('settleIfPending() applies the update and returns the settled row when still PENDING', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const findUnique = jest.fn().mockResolvedValue(buildRow({ status: 'APPROVED' }));
    const prisma = buildPrisma({ transaction: { updateMany, findUnique } });
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.settleIfPending('transaction-1', {
      status: 'APPROVED',
      providerStatus: 'APPROVED',
      providerTransactionId: 'gw-tx-1',
      failureReason: null,
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'transaction-1', status: 'PENDING' },
      data: {
        status: 'APPROVED',
        providerStatus: 'APPROVED',
        providerTransactionId: 'gw-tx-1',
        failureReason: null,
      },
    });
    expect(result._unsafeUnwrap()?.status).toBe('APPROVED');
  });

  it('settleIfPending() returns null when the transaction was already settled', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const findUnique = jest.fn();
    const prisma = buildPrisma({ transaction: { updateMany, findUnique } });
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.settleIfPending('transaction-1', {
      status: 'APPROVED',
      providerStatus: 'APPROVED',
      providerTransactionId: 'gw-tx-1',
      failureReason: null,
    });

    expect(result._unsafeUnwrap()).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('settleIfPending() wraps a Prisma failure', async () => {
    const prisma = buildPrisma({
      transaction: { updateMany: jest.fn().mockRejectedValue(new Error('down')) },
    });
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.settleIfPending('transaction-1', {
      status: 'APPROVED',
      providerStatus: 'APPROVED',
      providerTransactionId: 'gw-tx-1',
      failureReason: null,
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
  });
});
