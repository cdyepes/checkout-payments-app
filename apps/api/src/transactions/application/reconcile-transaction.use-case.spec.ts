import { errAsync, okAsync } from 'neverthrow';
import { GatewayError, NotFoundError } from '../../shared/domain/domain-error';
import { UnitOfWork } from '../../shared/domain/unit-of-work';
import { Delivery } from '../../deliveries/domain/delivery.entity';
import { DeliveryRepository } from '../../deliveries/domain/delivery.repository.port';
import { ProductRepository } from '../../products/domain/product.repository.port';
import { PaymentGateway } from '../../payments/domain/payment-gateway.port';
import { Transaction } from '../domain/transaction.entity';
import { TransactionRepository } from '../domain/transaction.repository.port';
import { ReconcileTransactionUseCase } from './reconcile-transaction.use-case';

const passthroughUnitOfWork: UnitOfWork = { run: (work) => work() };

function buildTransaction(
  overrides: Partial<{ status: Transaction['status']; providerTransactionId: string | null }> = {},
) {
  return Transaction.fromPersistence({
    id: 'transaction-1',
    reference: 'ref-1',
    status: overrides.status ?? 'PENDING',
    productId: 'product-1',
    customerId: 'customer-1',
    quantity: 2,
    productAmountInCents: 200_000,
    baseFeeInCents: 500_000,
    deliveryFeeInCents: 800_000,
    totalAmountInCents: 1_500_000,
    currency: 'COP',
    providerTransactionId: 'providerTransactionId' in overrides ? overrides.providerTransactionId! : 'gw-tx-1',
    providerStatus: null,
    failureReason: null,
  });
}

function buildDelivery() {
  return Delivery.fromPersistence({
    id: 'delivery-1',
    transactionId: 'transaction-1',
    customerId: 'customer-1',
    addressLine: 'Calle 123 #45-67',
    city: 'Bogotá',
    region: 'Cundinamarca',
    country: 'CO',
    postalCode: null,
    feeInCents: 800_000,
    status: 'PENDING',
    assignedProductId: null,
    quantity: 2,
  });
}

function buildRepos(overrides: {
  transaction?: Partial<TransactionRepository>;
  delivery?: Partial<DeliveryRepository>;
  product?: Partial<ProductRepository>;
  gateway?: Partial<PaymentGateway>;
} = {}) {
  const transactionRepository: TransactionRepository = {
    findById: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    settleIfPending: jest.fn(),
    ...overrides.transaction,
  };
  const deliveryRepository: DeliveryRepository = {
    findById: jest.fn(),
    findByTransactionId: jest.fn(),
    create: jest.fn(),
    assignProduct: jest.fn(),
    ...overrides.delivery,
  };
  const productRepository: ProductRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    decrementStock: jest.fn(),
    ...overrides.product,
  };
  const paymentGateway: PaymentGateway = {
    createTransaction: jest.fn(),
    getTransactionStatus: jest.fn(),
    ...overrides.gateway,
  };
  return { transactionRepository, deliveryRepository, productRepository, paymentGateway };
}

describe('ReconcileTransactionUseCase', () => {
  it('fails with NotFoundError when the transaction does not exist', async () => {
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({ transaction: { findById: jest.fn(() => okAsync(null)) } });
    const useCase = new ReconcileTransactionUseCase(
      passthroughUnitOfWork,
      transactionRepository,
      deliveryRepository,
      productRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'missing' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it('is a no-op when the transaction is already settled', async () => {
    const transaction = buildTransaction({ status: 'APPROVED' });
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({ transaction: { findById: jest.fn(() => okAsync(transaction)) } });
    const useCase = new ReconcileTransactionUseCase(
      passthroughUnitOfWork,
      transactionRepository,
      deliveryRepository,
      productRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1' });

    expect(result._unsafeUnwrap()).toBe(transaction);
    expect(paymentGateway.getTransactionStatus).not.toHaveBeenCalled();
  });

  it('is a no-op when the payment has not been submitted to the gateway yet', async () => {
    const transaction = buildTransaction({ providerTransactionId: null });
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({ transaction: { findById: jest.fn(() => okAsync(transaction)) } });
    const useCase = new ReconcileTransactionUseCase(
      passthroughUnitOfWork,
      transactionRepository,
      deliveryRepository,
      productRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1' });

    expect(result._unsafeUnwrap()).toBe(transaction);
    expect(paymentGateway.getTransactionStatus).not.toHaveBeenCalled();
  });

  it('leaves the transaction untouched when the gateway still reports PENDING', async () => {
    const transaction = buildTransaction();
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({
        transaction: { findById: jest.fn(() => okAsync(transaction)) },
        gateway: { getTransactionStatus: jest.fn(() => okAsync({ id: 'gw-tx-1', status: 'PENDING' })) },
      });
    const useCase = new ReconcileTransactionUseCase(
      passthroughUnitOfWork,
      transactionRepository,
      deliveryRepository,
      productRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1' });

    expect(result._unsafeUnwrap()).toBe(transaction);
    expect(transactionRepository.settleIfPending).not.toHaveBeenCalled();
  });

  it('settles an APPROVED transaction: updates status, assigns delivery, decrements stock', async () => {
    const transaction = buildTransaction();
    const delivery = buildDelivery();
    const settledTransaction = buildTransaction({ status: 'APPROVED' });
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({
        transaction: {
          findById: jest.fn(() => okAsync(transaction)),
          settleIfPending: jest.fn(() => okAsync(settledTransaction)),
        },
        delivery: {
          findByTransactionId: jest.fn(() => okAsync(delivery)),
          assignProduct: jest.fn(() => okAsync(delivery)),
        },
        product: { decrementStock: jest.fn(() => okAsync(true)) },
        gateway: {
          getTransactionStatus: jest.fn(() => okAsync({ id: 'gw-tx-1', status: 'APPROVED' })),
        },
      });
    const useCase = new ReconcileTransactionUseCase(
      passthroughUnitOfWork,
      transactionRepository,
      deliveryRepository,
      productRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1' });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(settledTransaction);
    expect(transactionRepository.settleIfPending).toHaveBeenCalledWith('transaction-1', {
      status: 'APPROVED',
      providerStatus: 'APPROVED',
      providerTransactionId: 'gw-tx-1',
      failureReason: null,
    });
    expect(deliveryRepository.findByTransactionId).toHaveBeenCalledWith('transaction-1');
    expect(deliveryRepository.assignProduct).toHaveBeenCalledWith('delivery-1', 'product-1');
    expect(productRepository.decrementStock).toHaveBeenCalledWith('product-1', 2);
  });

  it('settles a DECLINED transaction without touching delivery or stock', async () => {
    const transaction = buildTransaction();
    const settledTransaction = buildTransaction({ status: 'DECLINED' });
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({
        transaction: {
          findById: jest.fn(() => okAsync(transaction)),
          settleIfPending: jest.fn(() => okAsync(settledTransaction)),
        },
        gateway: {
          getTransactionStatus: jest.fn(() => okAsync({ id: 'gw-tx-1', status: 'DECLINED' })),
        },
      });
    const useCase = new ReconcileTransactionUseCase(
      passthroughUnitOfWork,
      transactionRepository,
      deliveryRepository,
      productRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1' });

    expect(result.isOk()).toBe(true);
    expect(transactionRepository.settleIfPending).toHaveBeenCalledWith('transaction-1', {
      status: 'DECLINED',
      providerStatus: 'DECLINED',
      providerTransactionId: 'gw-tx-1',
      failureReason: 'Provider status: DECLINED',
    });
    expect(deliveryRepository.findByTransactionId).not.toHaveBeenCalled();
    expect(productRepository.decrementStock).not.toHaveBeenCalled();
  });

  it('falls back to the current row when a concurrent reconcile already settled it', async () => {
    const transaction = buildTransaction();
    const alreadySettled = buildTransaction({ status: 'APPROVED' });
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({
        transaction: {
          findById: jest
            .fn()
            .mockReturnValueOnce(okAsync(transaction))
            .mockReturnValueOnce(okAsync(alreadySettled)),
          settleIfPending: jest.fn(() => okAsync(null)),
        },
        gateway: {
          getTransactionStatus: jest.fn(() => okAsync({ id: 'gw-tx-1', status: 'APPROVED' })),
        },
      });
    const useCase = new ReconcileTransactionUseCase(
      passthroughUnitOfWork,
      transactionRepository,
      deliveryRepository,
      productRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1' });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(alreadySettled);
    expect(deliveryRepository.assignProduct).not.toHaveBeenCalled();
    expect(productRepository.decrementStock).not.toHaveBeenCalled();
  });

  it('fails with NotFoundError when settling APPROVED but no delivery exists for the transaction', async () => {
    const transaction = buildTransaction();
    const settledTransaction = buildTransaction({ status: 'APPROVED' });
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({
        transaction: {
          findById: jest.fn(() => okAsync(transaction)),
          settleIfPending: jest.fn(() => okAsync(settledTransaction)),
        },
        delivery: { findByTransactionId: jest.fn(() => okAsync(null)) },
        gateway: {
          getTransactionStatus: jest.fn(() => okAsync({ id: 'gw-tx-1', status: 'APPROVED' })),
        },
      });
    const useCase = new ReconcileTransactionUseCase(
      passthroughUnitOfWork,
      transactionRepository,
      deliveryRepository,
      productRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    expect(productRepository.decrementStock).not.toHaveBeenCalled();
  });

  it('propagates a gateway failure', async () => {
    const transaction = buildTransaction();
    const gatewayError = new GatewayError('sandbox unreachable');
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({
        transaction: { findById: jest.fn(() => okAsync(transaction)) },
        gateway: { getTransactionStatus: jest.fn(() => errAsync(gatewayError)) },
      });
    const useCase = new ReconcileTransactionUseCase(
      passthroughUnitOfWork,
      transactionRepository,
      deliveryRepository,
      productRepository,
      paymentGateway,
    );

    const result = await useCase.execute({ transactionId: 'transaction-1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(gatewayError);
    expect(transactionRepository.settleIfPending).not.toHaveBeenCalled();
  });
});
