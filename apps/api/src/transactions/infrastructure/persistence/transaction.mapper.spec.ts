import { TransactionMapper, TransactionRow } from './transaction.mapper';

function buildItemRow(overrides: Partial<TransactionRow['items'][number]> = {}) {
  return {
    id: 'item-1',
    transactionId: 'transaction-1',
    productId: 'product-1',
    quantity: 2,
    unitPriceInCents: 100_000,
    subtotalInCents: 200_000,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('TransactionMapper', () => {
  it('maps a Prisma row to a domain Transaction', () => {
    const row: TransactionRow = {
      id: 'transaction-1',
      reference: 'ref-1',
      status: 'PENDING',
      customerId: 'customer-1',
      items: [buildItemRow()],
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
    };

    const transaction = TransactionMapper.toDomain(row);

    expect(transaction.id).toBe(row.id);
    expect(transaction.reference).toBe(row.reference);
    expect(transaction.status).toBe(row.status);
    expect(transaction.customerId).toBe(row.customerId);
    expect(transaction.items).toEqual([
      { productId: 'product-1', quantity: 2, unitPriceInCents: 100_000, subtotalInCents: 200_000 },
    ]);
    expect(transaction.productAmountInCents).toBe(row.productAmountInCents);
    expect(transaction.baseFeeInCents).toBe(row.baseFeeInCents);
    expect(transaction.deliveryFeeInCents).toBe(row.deliveryFeeInCents);
    expect(transaction.totalAmountInCents).toBe(row.totalAmountInCents);
    expect(transaction.currency).toBe(row.currency);
    expect(transaction.providerTransactionId).toBeNull();
    expect(transaction.providerStatus).toBeNull();
    expect(transaction.failureReason).toBeNull();
  });

  it('maps a transaction with an empty items array without throwing', () => {
    const row: TransactionRow = {
      id: 'transaction-1',
      reference: 'ref-1',
      status: 'PENDING',
      customerId: 'customer-1',
      items: [],
      productAmountInCents: 0,
      baseFeeInCents: 500_000,
      deliveryFeeInCents: 800_000,
      totalAmountInCents: 1_300_000,
      currency: 'COP',
      providerTransactionId: null,
      providerStatus: null,
      failureReason: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const transaction = TransactionMapper.toDomain(row);

    expect(transaction.items).toEqual([]);
  });
});
