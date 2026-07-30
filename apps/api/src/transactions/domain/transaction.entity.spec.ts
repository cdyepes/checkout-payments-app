import { Transaction, TransactionItem, TransactionProps } from './transaction.entity';

const ITEMS: readonly TransactionItem[] = [
  { productId: 'product-1', quantity: 1, unitPriceInCents: 10000, subtotalInCents: 10000 },
];

function buildTransaction(overrides: Partial<TransactionProps> = {}) {
  return Transaction.fromPersistence({
    id: 'transaction-1',
    reference: 'ref-1',
    status: 'PENDING',
    customerId: 'customer-1',
    items: ITEMS,
    productAmountInCents: 10000,
    baseFeeInCents: 1000,
    deliveryFeeInCents: 500,
    totalAmountInCents: 11500,
    currency: 'COP',
    providerTransactionId: null,
    providerStatus: null,
    failureReason: null,
    ...overrides,
  });
}

describe('Transaction', () => {
  it('exposes its persisted properties', () => {
    const transaction = buildTransaction();

    expect(transaction.id).toBe('transaction-1');
    expect(transaction.reference).toBe('ref-1');
    expect(transaction.status).toBe('PENDING');
    expect(transaction.customerId).toBe('customer-1');
    expect(transaction.items).toEqual(ITEMS);
    expect(transaction.productAmountInCents).toBe(10000);
    expect(transaction.baseFeeInCents).toBe(1000);
    expect(transaction.deliveryFeeInCents).toBe(500);
    expect(transaction.totalAmountInCents).toBe(11500);
    expect(transaction.currency).toBe('COP');
    expect(transaction.providerTransactionId).toBeNull();
    expect(transaction.providerStatus).toBeNull();
    expect(transaction.failureReason).toBeNull();
  });

  describe('isSettled', () => {
    it('is false while PENDING', () => {
      expect(buildTransaction({ status: 'PENDING' }).isSettled()).toBe(false);
    });

    it('is true once APPROVED, DECLINED, ERROR or VOIDED', () => {
      expect(buildTransaction({ status: 'APPROVED' }).isSettled()).toBe(true);
      expect(buildTransaction({ status: 'DECLINED' }).isSettled()).toBe(true);
      expect(buildTransaction({ status: 'ERROR' }).isSettled()).toBe(true);
      expect(buildTransaction({ status: 'VOIDED' }).isSettled()).toBe(true);
    });
  });
});
