import { errAsync, okAsync } from 'neverthrow';
import { NotFoundError, UnexpectedError } from '../../shared/domain/domain-error';
import { Transaction } from '../domain/transaction.entity';
import { TransactionRepository } from '../domain/transaction.repository.port';
import { GetTransactionUseCase } from './get-transaction.use-case';

function buildTransaction(id: string) {
  return Transaction.fromPersistence({
    id,
    reference: 'ref-1',
    status: 'PENDING',
    productId: 'product-1',
    customerId: 'customer-1',
    quantity: 1,
    productAmountInCents: 100_000,
    baseFeeInCents: 500_000,
    deliveryFeeInCents: 800_000,
    totalAmountInCents: 1_400_000,
    currency: 'COP',
    providerTransactionId: null,
    providerStatus: null,
    failureReason: null,
  });
}

describe('GetTransactionUseCase', () => {
  it('returns the transaction when it exists', async () => {
    const transaction = buildTransaction('1');
    const repository: TransactionRepository = {
      findById: jest.fn(() => okAsync(transaction)),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };
    const useCase = new GetTransactionUseCase(repository);

    const result = await useCase.execute({ id: '1' });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(transaction);
  });

  it('returns a NotFoundError when the repository finds nothing', async () => {
    const repository: TransactionRepository = {
      findById: jest.fn(() => okAsync(null)),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };
    const useCase = new GetTransactionUseCase(repository);

    const result = await useCase.execute({ id: 'missing' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it('propagates a repository failure', async () => {
    const error = new UnexpectedError('db down');
    const repository: TransactionRepository = {
      findById: jest.fn(() => errAsync(error)),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };
    const useCase = new GetTransactionUseCase(repository);

    const result = await useCase.execute({ id: '1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(error);
  });
});
