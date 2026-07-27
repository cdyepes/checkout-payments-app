import { errAsync, okAsync } from 'neverthrow';
import { ConflictError, NotFoundError, UnexpectedError } from '../../shared/domain/domain-error';
import { Customer } from '../../customers/domain/customer.entity';
import { CustomerRepository } from '../../customers/domain/customer.repository.port';
import { GatewayError } from '../../shared/domain/domain-error';
import { PaymentGateway } from '../../payments/domain/payment-gateway.port';
import { Transaction } from '../domain/transaction.entity';
import { TransactionRepository } from '../domain/transaction.repository.port';
import { SubmitTransactionPaymentUseCase } from './submit-transaction-payment.use-case';

function buildTransaction(overrides: Partial<{ status: Transaction['status']; providerTransactionId: string | null }> = {}) {
  return Transaction.fromPersistence({
    id: 'transaction-1',
    reference: 'ref-1',
    status: overrides.status ?? 'PENDING',
    productId: 'product-1',
    customerId: 'customer-1',
    quantity: 1,
    productAmountInCents: 100_000,
    baseFeeInCents: 500_000,
    deliveryFeeInCents: 800_000,
    totalAmountInCents: 1_400_000,
    currency: 'COP',
    providerTransactionId: overrides.providerTransactionId ?? null,
    providerStatus: null,
    failureReason: null,
  });
}

function buildCustomer() {
  return Customer.fromPersistence({
    id: 'customer-1',
    email: 'jane@example.com',
    fullName: 'Jane Doe',
    phone: '+573001234567',
    legalId: null,
  });
}

describe('SubmitTransactionPaymentUseCase', () => {
  it('submits the payment and records the provider transaction id, keeping status PENDING', async () => {
    const transaction = buildTransaction();
    const customer = buildCustomer();
    const settledTransaction = buildTransaction({ providerTransactionId: 'gw-tx-1' });

    const transactionRepository: TransactionRepository = {
      findById: jest.fn(() => okAsync(transaction)),
      create: jest.fn(),
      updateStatus: jest.fn(() => okAsync(settledTransaction)),
      settleIfPending: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(() => okAsync(customer)),
      findOrCreateByEmail: jest.fn(),
    };
    const paymentGateway: PaymentGateway = {
      createTransaction: jest.fn(() => okAsync({ id: 'gw-tx-1', status: 'PENDING' })),
      getTransactionStatus: jest.fn(),
    };

    const useCase = new SubmitTransactionPaymentUseCase(
      transactionRepository,
      customerRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1', cardToken: 'tok_test_1' });

    expect(result.isOk()).toBe(true);
    expect(paymentGateway.createTransaction).toHaveBeenCalledWith({
      reference: 'ref-1',
      amountInCents: 1_400_000,
      currency: 'COP',
      cardToken: 'tok_test_1',
      customerEmail: 'jane@example.com',
    });
    expect(transactionRepository.updateStatus).toHaveBeenCalledWith('transaction-1', {
      status: 'PENDING',
      providerStatus: 'PENDING',
      providerTransactionId: 'gw-tx-1',
      failureReason: null,
    });
  });

  it('fails with NotFoundError when the transaction does not exist', async () => {
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(() => okAsync(null)),
      create: jest.fn(),
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(),
    };
    const paymentGateway: PaymentGateway = {
      createTransaction: jest.fn(),
      getTransactionStatus: jest.fn(),
    };

    const useCase = new SubmitTransactionPaymentUseCase(
      transactionRepository,
      customerRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'missing', cardToken: 'tok_test_1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    expect(paymentGateway.createTransaction).not.toHaveBeenCalled();
  });

  it('fails with ConflictError when the transaction is no longer PENDING', async () => {
    const transaction = buildTransaction({ status: 'APPROVED' });
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(() => okAsync(transaction)),
      create: jest.fn(),
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(),
    };
    const paymentGateway: PaymentGateway = {
      createTransaction: jest.fn(),
      getTransactionStatus: jest.fn(),
    };

    const useCase = new SubmitTransactionPaymentUseCase(
      transactionRepository,
      customerRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1', cardToken: 'tok_test_1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ConflictError);
    expect(paymentGateway.createTransaction).not.toHaveBeenCalled();
  });

  it('fails with ConflictError when the transaction was already submitted for payment', async () => {
    const transaction = buildTransaction({ providerTransactionId: 'gw-tx-existing' });
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(() => okAsync(transaction)),
      create: jest.fn(),
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(),
    };
    const paymentGateway: PaymentGateway = {
      createTransaction: jest.fn(),
      getTransactionStatus: jest.fn(),
    };

    const useCase = new SubmitTransactionPaymentUseCase(
      transactionRepository,
      customerRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1', cardToken: 'tok_test_1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ConflictError);
    expect(paymentGateway.createTransaction).not.toHaveBeenCalled();
  });

  it('fails with NotFoundError when the customer no longer exists', async () => {
    const transaction = buildTransaction();
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(() => okAsync(transaction)),
      create: jest.fn(),
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(() => okAsync(null)),
      findOrCreateByEmail: jest.fn(),
    };
    const paymentGateway: PaymentGateway = {
      createTransaction: jest.fn(),
      getTransactionStatus: jest.fn(),
    };

    const useCase = new SubmitTransactionPaymentUseCase(
      transactionRepository,
      customerRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1', cardToken: 'tok_test_1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    expect(paymentGateway.createTransaction).not.toHaveBeenCalled();
  });

  it('propagates a gateway failure without updating the transaction', async () => {
    const transaction = buildTransaction();
    const customer = buildCustomer();
    const updateStatus = jest.fn();
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(() => okAsync(transaction)),
      create: jest.fn(),
      updateStatus,
      settleIfPending: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(() => okAsync(customer)),
      findOrCreateByEmail: jest.fn(),
    };
    const gatewayError = new GatewayError('sandbox unreachable');
    const paymentGateway: PaymentGateway = {
      createTransaction: jest.fn(() => errAsync(gatewayError)),
      getTransactionStatus: jest.fn(),
    };

    const useCase = new SubmitTransactionPaymentUseCase(
      transactionRepository,
      customerRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1', cardToken: 'tok_test_1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(gatewayError);
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('propagates a repository failure when persisting the provider transaction id', async () => {
    const transaction = buildTransaction();
    const customer = buildCustomer();
    const persistError = new UnexpectedError('db down');
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(() => okAsync(transaction)),
      create: jest.fn(),
      updateStatus: jest.fn(() => errAsync(persistError)),
      settleIfPending: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(() => okAsync(customer)),
      findOrCreateByEmail: jest.fn(),
    };
    const paymentGateway: PaymentGateway = {
      createTransaction: jest.fn(() => okAsync({ id: 'gw-tx-1', status: 'PENDING' })),
      getTransactionStatus: jest.fn(),
    };

    const useCase = new SubmitTransactionPaymentUseCase(
      transactionRepository,
      customerRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1', cardToken: 'tok_test_1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(persistError);
  });
});
