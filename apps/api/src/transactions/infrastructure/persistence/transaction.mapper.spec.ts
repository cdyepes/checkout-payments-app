import { Transaction as PrismaTransaction } from '@prisma/client';
import { TransactionMapper } from './transaction.mapper';

describe('TransactionMapper', () => {
  it('maps a Prisma row to a domain Transaction', () => {
    const row: PrismaTransaction = {
      id: 'transaction-1',
      reference: 'ref-1',
      status: 'PENDING',
      productId: 'product-1',
      customerId: 'customer-1',
      quantity: 2,
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
    expect(transaction.productId).toBe(row.productId);
    expect(transaction.customerId).toBe(row.customerId);
    expect(transaction.quantity).toBe(row.quantity);
    expect(transaction.productAmountInCents).toBe(row.productAmountInCents);
    expect(transaction.baseFeeInCents).toBe(row.baseFeeInCents);
    expect(transaction.deliveryFeeInCents).toBe(row.deliveryFeeInCents);
    expect(transaction.totalAmountInCents).toBe(row.totalAmountInCents);
    expect(transaction.currency).toBe(row.currency);
    expect(transaction.providerTransactionId).toBeNull();
    expect(transaction.providerStatus).toBeNull();
    expect(transaction.failureReason).toBeNull();
  });
});
