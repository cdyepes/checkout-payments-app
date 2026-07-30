import { ConflictException, NotFoundException } from '@nestjs/common';
import { errAsync, okAsync } from 'neverthrow';
import { NotFoundError } from '../../../shared/domain/domain-error';
import { InsufficientStockError } from '../../domain/insufficient-stock.error';
import { Transaction } from '../../domain/transaction.entity';
import { CreateCheckoutTransactionUseCase } from '../../application/create-checkout-transaction.use-case';
import { ReconcileTransactionUseCase } from '../../application/reconcile-transaction.use-case';
import { SubmitTransactionPaymentUseCase } from '../../application/submit-transaction-payment.use-case';
import { TransactionsController } from './transactions.controller';

function buildTransaction(id: string) {
  return Transaction.fromPersistence({
    id,
    reference: 'ref-1',
    status: 'PENDING',
    customerId: 'customer-1',
    items: [
      { productId: 'product-1', quantity: 1, unitPriceInCents: 100_000, subtotalInCents: 100_000 },
    ],
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
  items: [{ productId: '11111111-1111-4111-8111-111111111111', quantity: 1 }],
  customer: { email: 'jane@example.com', fullName: 'Jane Doe', phone: '+573001234567' },
  delivery: { addressLine: 'Calle 123', city: 'Bogotá', region: 'Cundinamarca', country: 'CO' },
};

describe('TransactionsController', () => {
  it('create() returns the created transaction', async () => {
    const createCheckoutTransaction = {
      execute: jest.fn(() => okAsync(buildTransaction('1'))),
    } as unknown as CreateCheckoutTransactionUseCase;
    const submitTransactionPayment = {} as SubmitTransactionPaymentUseCase;
    const reconcileTransaction = {} as ReconcileTransactionUseCase;
    const controller = new TransactionsController(
      createCheckoutTransaction,
      submitTransactionPayment,
      reconcileTransaction,
    );

    const response = await controller.create(requestBody);

    expect(response.id).toBe('1');
    expect(response.status).toBe('PENDING');
    expect(createCheckoutTransaction.execute).toHaveBeenCalledWith(requestBody);
  });

  it('create() throws ConflictException when stock is insufficient', async () => {
    const createCheckoutTransaction = {
      execute: jest.fn(() => errAsync(new InsufficientStockError('product-1', 3, 1))),
    } as unknown as CreateCheckoutTransactionUseCase;
    const submitTransactionPayment = {} as SubmitTransactionPaymentUseCase;
    const reconcileTransaction = {} as ReconcileTransactionUseCase;
    const controller = new TransactionsController(
      createCheckoutTransaction,
      submitTransactionPayment,
      reconcileTransaction,
    );

    await expect(controller.create(requestBody)).rejects.toBeInstanceOf(ConflictException);
  });

  it('submitPayment() returns the transaction after submitting the card token', async () => {
    const createCheckoutTransaction = {} as CreateCheckoutTransactionUseCase;
    const submitTransactionPayment = {
      execute: jest.fn(() => okAsync(buildTransaction('1'))),
    } as unknown as SubmitTransactionPaymentUseCase;
    const reconcileTransaction = {} as ReconcileTransactionUseCase;
    const controller = new TransactionsController(
      createCheckoutTransaction,
      submitTransactionPayment,
      reconcileTransaction,
    );

    const response = await controller.submitPayment({ id: '1' }, { cardToken: 'tok_test_1' });

    expect(response.id).toBe('1');
    expect(submitTransactionPayment.execute).toHaveBeenCalledWith({
      transactionId: '1',
      cardToken: 'tok_test_1',
    });
  });

  it('submitPayment() throws ConflictException when the use case rejects double submission', async () => {
    const createCheckoutTransaction = {} as CreateCheckoutTransactionUseCase;
    const submitTransactionPayment = {
      execute: jest.fn(() =>
        errAsync({ code: 'CONFLICT', message: 'already submitted' } as never),
      ),
    } as unknown as SubmitTransactionPaymentUseCase;
    const reconcileTransaction = {} as ReconcileTransactionUseCase;
    const controller = new TransactionsController(
      createCheckoutTransaction,
      submitTransactionPayment,
      reconcileTransaction,
    );

    await expect(
      controller.submitPayment({ id: '1' }, { cardToken: 'tok_test_1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('getById() returns the reconciled transaction when found', async () => {
    const createCheckoutTransaction = {} as CreateCheckoutTransactionUseCase;
    const submitTransactionPayment = {} as SubmitTransactionPaymentUseCase;
    const reconcileTransaction = {
      execute: jest.fn(() => okAsync(buildTransaction('1'))),
    } as unknown as ReconcileTransactionUseCase;
    const controller = new TransactionsController(
      createCheckoutTransaction,
      submitTransactionPayment,
      reconcileTransaction,
    );

    const response = await controller.getById({ id: '1' });

    expect(response.id).toBe('1');
    expect(reconcileTransaction.execute).toHaveBeenCalledWith({ transactionId: '1' });
  });

  it('getById() throws NotFoundException when the use case fails with NotFoundError', async () => {
    const createCheckoutTransaction = {} as CreateCheckoutTransactionUseCase;
    const submitTransactionPayment = {} as SubmitTransactionPaymentUseCase;
    const reconcileTransaction = {
      execute: jest.fn(() => errAsync(new NotFoundError('Transaction', 'missing'))),
    } as unknown as ReconcileTransactionUseCase;
    const controller = new TransactionsController(
      createCheckoutTransaction,
      submitTransactionPayment,
      reconcileTransaction,
    );

    await expect(controller.getById({ id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
