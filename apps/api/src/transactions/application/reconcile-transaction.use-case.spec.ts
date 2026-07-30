import { errAsync, okAsync } from 'neverthrow';
import { GatewayError, NotFoundError } from '../../shared/domain/domain-error';
import { UnitOfWork } from '../../shared/domain/unit-of-work';
import { Delivery } from '../../deliveries/domain/delivery.entity';
import { DeliveryRepository } from '../../deliveries/domain/delivery.repository.port';
import { ProductRepository } from '../../products/domain/product.repository.port';
import { PaymentGateway } from '../../payments/domain/payment-gateway.port';
import { Transaction, TransactionItem } from '../domain/transaction.entity';
import { TransactionRepository } from '../domain/transaction.repository.port';
import { ReconcileTransactionUseCase } from './reconcile-transaction.use-case';

const passthroughUnitOfWork: UnitOfWork = { run: (work) => work() };

const SINGLE_ITEM: readonly TransactionItem[] = [
  { productId: 'product-1', quantity: 2, unitPriceInCents: 100_000, subtotalInCents: 200_000 },
];

function buildTransaction(
  overrides: Partial<{
    status: Transaction['status'];
    providerTransactionId: string | null;
    providerStatus: string | null;
    items: readonly TransactionItem[];
  }> = {},
) {
  return Transaction.fromPersistence({
    id: 'transaction-1',
    reference: 'ref-1',
    status: overrides.status ?? 'PENDING',
    customerId: 'customer-1',
    items: overrides.items ?? SINGLE_ITEM,
    productAmountInCents: 200_000,
    baseFeeInCents: 500_000,
    deliveryFeeInCents: 800_000,
    totalAmountInCents: 1_500_000,
    currency: 'COP',
    providerTransactionId:
      'providerTransactionId' in overrides ? overrides.providerTransactionId! : 'gw-tx-1',
    providerStatus: overrides.providerStatus ?? null,
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
  });
}

function buildRepos(
  overrides: {
    transaction?: Partial<TransactionRepository>;
    delivery?: Partial<DeliveryRepository>;
    product?: Partial<ProductRepository>;
    gateway?: Partial<PaymentGateway>;
  } = {},
) {
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
    markAssigned: jest.fn(),
    ...overrides.delivery,
  };
  const productRepository: ProductRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findManyByIds: jest.fn(),
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
          markAssigned: jest.fn(() => okAsync(delivery)),
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
    expect(productRepository.decrementStock).toHaveBeenCalledWith('product-1', 2);
    expect(deliveryRepository.markAssigned).toHaveBeenCalledWith('delivery-1');
  });

  it('settles a multi-item APPROVED transaction: decrements every line and marks the delivery assigned', async () => {
    const items: readonly TransactionItem[] = [
      { productId: 'product-1', quantity: 1, unitPriceInCents: 100_000, subtotalInCents: 100_000 },
      { productId: 'product-2', quantity: 3, unitPriceInCents: 50_000, subtotalInCents: 150_000 },
    ];
    const transaction = buildTransaction({ items });
    const delivery = buildDelivery();
    const settledTransaction = buildTransaction({ status: 'APPROVED', items });
    const decrementStock = jest.fn(() => okAsync(true));
    const markAssigned = jest.fn(() => okAsync(delivery));
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({
        transaction: {
          findById: jest.fn(() => okAsync(transaction)),
          settleIfPending: jest.fn(() => okAsync(settledTransaction)),
        },
        delivery: {
          findByTransactionId: jest.fn(() => okAsync(delivery)),
          markAssigned,
        },
        product: { decrementStock },
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
    expect(decrementStock).toHaveBeenCalledTimes(2);
    expect(decrementStock).toHaveBeenNthCalledWith(1, 'product-1', 1);
    expect(decrementStock).toHaveBeenNthCalledWith(2, 'product-2', 3);
    expect(markAssigned).toHaveBeenCalledWith('delivery-1');
  });

  it('decrements stock in productId-sorted order regardless of item order, to avoid deadlocks', async () => {
    const items: readonly TransactionItem[] = [
      { productId: 'product-9', quantity: 1, unitPriceInCents: 10_000, subtotalInCents: 10_000 },
      { productId: 'product-2', quantity: 1, unitPriceInCents: 10_000, subtotalInCents: 10_000 },
    ];
    const transaction = buildTransaction({ items });
    const delivery = buildDelivery();
    const settledTransaction = buildTransaction({ status: 'APPROVED', items });
    const decrementStock = jest.fn(() => okAsync(true));
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({
        transaction: {
          findById: jest.fn(() => okAsync(transaction)),
          settleIfPending: jest.fn(() => okAsync(settledTransaction)),
        },
        delivery: {
          findByTransactionId: jest.fn(() => okAsync(delivery)),
          markAssigned: jest.fn(() => okAsync(delivery)),
        },
        product: { decrementStock },
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

    await useCase.execute({ transactionId: 'transaction-1' });

    expect(decrementStock).toHaveBeenNthCalledWith(1, 'product-2', 1);
    expect(decrementStock).toHaveBeenNthCalledWith(2, 'product-9', 1);
  });

  it('keeps the transaction APPROVED and flags the shortfall when one of several items is out of stock', async () => {
    const items: readonly TransactionItem[] = [
      { productId: 'product-1', quantity: 1, unitPriceInCents: 100_000, subtotalInCents: 100_000 },
      { productId: 'product-2', quantity: 3, unitPriceInCents: 50_000, subtotalInCents: 150_000 },
    ];
    const transaction = buildTransaction({ items });
    const delivery = buildDelivery();
    const settledTransaction = buildTransaction({
      status: 'APPROVED',
      items,
      providerStatus: 'APPROVED',
    });
    const decrementStock = jest.fn((productId: string) =>
      okAsync(productId !== 'product-2'),
    );
    const markAssigned = jest.fn(() => okAsync(delivery));
    const updateStatus = jest.fn(() => okAsync(settledTransaction));
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({
        transaction: {
          findById: jest.fn(() => okAsync(transaction)),
          settleIfPending: jest.fn(() => okAsync(settledTransaction)),
          updateStatus,
        },
        delivery: {
          findByTransactionId: jest.fn(() => okAsync(delivery)),
          markAssigned,
        },
        product: { decrementStock },
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
    expect(markAssigned).not.toHaveBeenCalled();
    expect(updateStatus).toHaveBeenCalledWith('transaction-1', {
      status: 'APPROVED',
      providerStatus: 'APPROVED',
      providerTransactionId: 'gw-tx-1',
      failureReason: expect.stringContaining('product-2'),
    });
  });

  it('keeps the transaction APPROVED and flags every product when all items are out of stock', async () => {
    const items: readonly TransactionItem[] = [
      { productId: 'product-1', quantity: 1, unitPriceInCents: 100_000, subtotalInCents: 100_000 },
      { productId: 'product-2', quantity: 3, unitPriceInCents: 50_000, subtotalInCents: 150_000 },
    ];
    const transaction = buildTransaction({ items });
    const delivery = buildDelivery();
    const settledTransaction = buildTransaction({
      status: 'APPROVED',
      items,
      providerStatus: 'APPROVED',
    });
    const decrementStock = jest.fn(() => okAsync(false));
    const markAssigned = jest.fn(() => okAsync(delivery));
    const updateStatus = jest.fn(
      (_id: string, _update: Parameters<TransactionRepository['updateStatus']>[1]) =>
        okAsync(settledTransaction),
    );
    const { transactionRepository, deliveryRepository, productRepository, paymentGateway } =
      buildRepos({
        transaction: {
          findById: jest.fn(() => okAsync(transaction)),
          settleIfPending: jest.fn(() => okAsync(settledTransaction)),
          updateStatus,
        },
        delivery: {
          findByTransactionId: jest.fn(() => okAsync(delivery)),
          markAssigned,
        },
        product: { decrementStock },
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
    expect(markAssigned).not.toHaveBeenCalled();
    const failureReason = updateStatus.mock.calls[0]![1].failureReason as string;
    expect(failureReason).toContain('product-1');
    expect(failureReason).toContain('product-2');
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
    expect(deliveryRepository.markAssigned).not.toHaveBeenCalled();
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
