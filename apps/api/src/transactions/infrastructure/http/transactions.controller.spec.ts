import { ConflictException, NotFoundException } from '@nestjs/common';
import { errAsync, okAsync } from 'neverthrow';
import { NotFoundError } from '../../../shared/domain/domain-error';
import { InsufficientStockError } from '../../domain/insufficient-stock.error';
import { Transaction } from '../../domain/transaction.entity';
import { CreateCheckoutTransactionUseCase } from '../../application/create-checkout-transaction.use-case';
import { GetTransactionUseCase } from '../../application/get-transaction.use-case';
import { TransactionsController } from './transactions.controller';

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

const requestBody = {
  productId: '11111111-1111-4111-8111-111111111111',
  quantity: 1,
  customer: { email: 'jane@example.com', fullName: 'Jane Doe', phone: '+573001234567' },
  delivery: { addressLine: 'Calle 123', city: 'Bogotá', region: 'Cundinamarca', country: 'CO' },
};

describe('TransactionsController', () => {
  it('create() returns the created transaction', async () => {
    const createCheckoutTransaction = {
      execute: jest.fn(() => okAsync(buildTransaction('1'))),
    } as unknown as CreateCheckoutTransactionUseCase;
    const getTransaction = {} as GetTransactionUseCase;
    const controller = new TransactionsController(createCheckoutTransaction, getTransaction);

    const response = await controller.create(requestBody);

    expect(response.id).toBe('1');
    expect(response.status).toBe('PENDING');
    expect(createCheckoutTransaction.execute).toHaveBeenCalledWith(requestBody);
  });

  it('create() throws ConflictException when stock is insufficient', async () => {
    const createCheckoutTransaction = {
      execute: jest.fn(() => errAsync(new InsufficientStockError('product-1', 3, 1))),
    } as unknown as CreateCheckoutTransactionUseCase;
    const getTransaction = {} as GetTransactionUseCase;
    const controller = new TransactionsController(createCheckoutTransaction, getTransaction);

    await expect(controller.create(requestBody)).rejects.toBeInstanceOf(ConflictException);
  });

  it('getById() returns the transaction when found', async () => {
    const createCheckoutTransaction = {} as CreateCheckoutTransactionUseCase;
    const getTransaction = {
      execute: jest.fn(() => okAsync(buildTransaction('1'))),
    } as unknown as GetTransactionUseCase;
    const controller = new TransactionsController(createCheckoutTransaction, getTransaction);

    const response = await controller.getById({ id: '1' });

    expect(response.id).toBe('1');
  });

  it('getById() throws NotFoundException when the use case fails with NotFoundError', async () => {
    const createCheckoutTransaction = {} as CreateCheckoutTransactionUseCase;
    const getTransaction = {
      execute: jest.fn(() => errAsync(new NotFoundError('Transaction', 'missing'))),
    } as unknown as GetTransactionUseCase;
    const controller = new TransactionsController(createCheckoutTransaction, getTransaction);

    await expect(controller.getById({ id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
