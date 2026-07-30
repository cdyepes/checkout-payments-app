import { errAsync, okAsync } from 'neverthrow';
import { NotFoundError, UnexpectedError } from '../../shared/domain/domain-error';
import { UnitOfWork } from '../../shared/domain/unit-of-work';
import { Customer } from '../../customers/domain/customer.entity';
import { CustomerRepository } from '../../customers/domain/customer.repository.port';
import { Delivery } from '../../deliveries/domain/delivery.entity';
import { DeliveryRepository } from '../../deliveries/domain/delivery.repository.port';
import { Product } from '../../products/domain/product.entity';
import { ProductRepository } from '../../products/domain/product.repository.port';
import { InsufficientStockError } from '../domain/insufficient-stock.error';
import { Transaction } from '../domain/transaction.entity';
import { TransactionRepository } from '../domain/transaction.repository.port';
import {
  CreateCheckoutTransactionCommand,
  CreateCheckoutTransactionUseCase,
} from './create-checkout-transaction.use-case';

function buildProduct(overrides: Partial<{ id: string; priceInCents: number; stock: number }> = {}) {
  return Product.fromPersistence({
    id: 'product-1',
    name: 'Keyboard',
    description: 'A keyboard',
    imageUrl: 'https://example.com/keyboard.jpg',
    priceInCents: 100_000,
    currency: 'COP',
    stock: 5,
    ...overrides,
  });
}

function buildCustomer(id = 'customer-1') {
  return Customer.fromPersistence({
    id,
    email: 'jane@example.com',
    fullName: 'Jane Doe',
    phone: '+573001234567',
    legalId: null,
  });
}

function buildTransaction(id = 'transaction-1') {
  return Transaction.fromPersistence({
    id,
    reference: 'ref-1',
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
}

function buildDelivery(id = 'delivery-1') {
  return Delivery.fromPersistence({
    id,
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

function buildCommand(
  overrides: Partial<CreateCheckoutTransactionCommand> = {},
): CreateCheckoutTransactionCommand {
  return {
    items: [{ productId: 'product-1', quantity: 2 }],
    customer: {
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      phone: '+573001234567',
    },
    delivery: {
      addressLine: 'Calle 123 #45-67',
      city: 'Bogotá',
      region: 'Cundinamarca',
      country: 'CO',
    },
    ...overrides,
  };
}

const passthroughUnitOfWork: UnitOfWork = { run: (work) => work() };

describe('CreateCheckoutTransactionUseCase', () => {
  it('creates the transaction and delivery on the happy path', async () => {
    const product = buildProduct({ stock: 5 });
    const customer = buildCustomer();
    const transaction = buildTransaction();
    const delivery = buildDelivery();

    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findManyByIds: jest.fn(() => okAsync([product])),
      decrementStock: jest.fn(),
    };
    const findOrCreateByEmail = jest.fn(() => okAsync(customer));
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail,
    };
    const createTransaction = jest.fn(
      (_props: Parameters<TransactionRepository['create']>[0]) => okAsync(transaction),
    );
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: createTransaction,
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };
    const createDelivery = jest.fn(() => okAsync(delivery));
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: createDelivery,
      markAssigned: jest.fn(),
    };

    const useCase = new CreateCheckoutTransactionUseCase(
      passthroughUnitOfWork,
      productRepository,
      customerRepository,
      deliveryRepository,
      transactionRepository,
    );

    const result = await useCase.execute(buildCommand());

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(transaction);

    expect(findOrCreateByEmail).toHaveBeenCalledWith({
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      phone: '+573001234567',
      legalId: null,
    });

    const createArgs = createTransaction.mock.calls[0]![0];
    expect(createArgs).toMatchObject({
      status: 'PENDING',
      customerId: 'customer-1',
      items: [
        { productId: 'product-1', quantity: 2, unitPriceInCents: 100_000, subtotalInCents: 200_000 },
      ],
      productAmountInCents: 200_000, // priceInCents (100_000) * quantity (2)
      baseFeeInCents: 500_000,
      deliveryFeeInCents: 800_000,
      totalAmountInCents: 1_500_000,
      currency: 'COP',
    });
    expect(typeof createArgs.reference).toBe('string');
    expect(createArgs.reference.length).toBeGreaterThan(0);

    expect(createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: transaction.id,
        customerId: customer.id,
        addressLine: 'Calle 123 #45-67',
        feeInCents: 800_000,
        status: 'PENDING',
      }),
    );
  });

  it('creates a multi-item transaction with fees charged once, not per item', async () => {
    const keyboard = buildProduct({ id: 'product-1', priceInCents: 100_000, stock: 5 });
    const headphones = buildProduct({ id: 'product-2', priceInCents: 50_000, stock: 5 });
    const customer = buildCustomer();
    const transaction = buildTransaction();
    const delivery = buildDelivery();

    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findManyByIds: jest.fn(() => okAsync([keyboard, headphones])),
      decrementStock: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(() => okAsync(customer)),
    };
    const createTransaction = jest.fn(
      (_props: Parameters<TransactionRepository['create']>[0]) => okAsync(transaction),
    );
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: createTransaction,
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(() => okAsync(delivery)),
      markAssigned: jest.fn(),
    };

    const useCase = new CreateCheckoutTransactionUseCase(
      passthroughUnitOfWork,
      productRepository,
      customerRepository,
      deliveryRepository,
      transactionRepository,
    );

    const result = await useCase.execute(
      buildCommand({
        items: [
          { productId: 'product-1', quantity: 2 }, // 200_000
          { productId: 'product-2', quantity: 3 }, // 150_000
        ],
      }),
    );

    expect(result.isOk()).toBe(true);
    const createArgs = createTransaction.mock.calls[0]![0];
    expect(createArgs.items).toEqual([
      { productId: 'product-1', quantity: 2, unitPriceInCents: 100_000, subtotalInCents: 200_000 },
      { productId: 'product-2', quantity: 3, unitPriceInCents: 50_000, subtotalInCents: 150_000 },
    ]);
    expect(createArgs.productAmountInCents).toBe(350_000);
    expect(createArgs.baseFeeInCents).toBe(500_000);
    expect(createArgs.deliveryFeeInCents).toBe(800_000);
    expect(createArgs.totalAmountInCents).toBe(1_650_000); // 350_000 + 500_000 + 800_000, fees once
  });

  it('fails with NotFoundError when the product does not exist', async () => {
    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findManyByIds: jest.fn(() => okAsync([])),
      decrementStock: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(),
    };
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(),
      markAssigned: jest.fn(),
    };
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };

    const useCase = new CreateCheckoutTransactionUseCase(
      passthroughUnitOfWork,
      productRepository,
      customerRepository,
      deliveryRepository,
      transactionRepository,
    );

    const result = await useCase.execute(
      buildCommand({ items: [{ productId: 'missing', quantity: 1 }] }),
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    expect(customerRepository.findOrCreateByEmail).not.toHaveBeenCalled();
  });

  it('fails with NotFoundError naming the second product when only it is missing', async () => {
    const product = buildProduct({ id: 'product-1', stock: 5 });
    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findManyByIds: jest.fn(() => okAsync([product])),
      decrementStock: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(),
    };
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(),
      markAssigned: jest.fn(),
    };
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };

    const useCase = new CreateCheckoutTransactionUseCase(
      passthroughUnitOfWork,
      productRepository,
      customerRepository,
      deliveryRepository,
      transactionRepository,
    );

    const result = await useCase.execute(
      buildCommand({
        items: [
          { productId: 'product-1', quantity: 1 },
          { productId: 'missing-product', quantity: 1 },
          { productId: 'product-3', quantity: 1 },
        ],
      }),
    );

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toContain('missing-product');
  });

  it('fails with InsufficientStockError when stock is too low', async () => {
    const product = buildProduct({ stock: 1 });
    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findManyByIds: jest.fn(() => okAsync([product])),
      decrementStock: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(),
    };
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(),
      markAssigned: jest.fn(),
    };
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };

    const useCase = new CreateCheckoutTransactionUseCase(
      passthroughUnitOfWork,
      productRepository,
      customerRepository,
      deliveryRepository,
      transactionRepository,
    );

    const result = await useCase.execute(
      buildCommand({ items: [{ productId: 'product-1', quantity: 3 }] }),
    );

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(InsufficientStockError);
    expect((error as InsufficientStockError).available).toBe(1);
    expect((error as InsufficientStockError).requested).toBe(3);
    expect(customerRepository.findOrCreateByEmail).not.toHaveBeenCalled();
  });

  it('fails with InsufficientStockError naming the second item when only it lacks stock', async () => {
    const plenty = buildProduct({ id: 'product-1', stock: 5 });
    const scarce = buildProduct({ id: 'product-2', stock: 1 });
    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findManyByIds: jest.fn(() => okAsync([plenty, scarce])),
      decrementStock: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(),
    };
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(),
      markAssigned: jest.fn(),
    };
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };

    const useCase = new CreateCheckoutTransactionUseCase(
      passthroughUnitOfWork,
      productRepository,
      customerRepository,
      deliveryRepository,
      transactionRepository,
    );

    const result = await useCase.execute(
      buildCommand({
        items: [
          { productId: 'product-1', quantity: 1 },
          { productId: 'product-2', quantity: 3 },
        ],
      }),
    );

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(InsufficientStockError);
    expect((error as InsufficientStockError).productId).toBe('product-2');
  });

  it('fails with InsufficientStockError for a zero or negative quantity', async () => {
    const product = buildProduct({ stock: 5 });
    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findManyByIds: jest.fn(() => okAsync([product])),
      decrementStock: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(),
    };
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(),
      markAssigned: jest.fn(),
    };
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };

    const useCase = new CreateCheckoutTransactionUseCase(
      passthroughUnitOfWork,
      productRepository,
      customerRepository,
      deliveryRepository,
      transactionRepository,
    );

    const result = await useCase.execute(
      buildCommand({ items: [{ productId: 'product-1', quantity: 0 }] }),
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(InsufficientStockError);
  });

  it('propagates a customer repository failure without creating a transaction', async () => {
    const product = buildProduct({ stock: 5 });
    const error = new UnexpectedError('db down');
    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findManyByIds: jest.fn(() => okAsync([product])),
      decrementStock: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(() => errAsync(error)),
    };
    const createTransaction = jest.fn();
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(),
      markAssigned: jest.fn(),
    };
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: createTransaction,
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };

    const useCase = new CreateCheckoutTransactionUseCase(
      passthroughUnitOfWork,
      productRepository,
      customerRepository,
      deliveryRepository,
      transactionRepository,
    );

    const result = await useCase.execute(buildCommand());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(error);
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('runs the whole pipeline inside the UnitOfWork', async () => {
    const product = buildProduct({ stock: 5 });
    const customer = buildCustomer();
    const transaction = buildTransaction();
    const delivery = buildDelivery();

    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findManyByIds: jest.fn(() => okAsync([product])),
      decrementStock: jest.fn(),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(() => okAsync(customer)),
    };
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: jest.fn(() => okAsync(transaction)),
      updateStatus: jest.fn(),
      settleIfPending: jest.fn(),
    };
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(() => okAsync(delivery)),
      markAssigned: jest.fn(),
    };
    let runCallCount = 0;
    const unitOfWork: UnitOfWork = {
      run: (work) => {
        runCallCount += 1;
        return work();
      },
    };

    const useCase = new CreateCheckoutTransactionUseCase(
      unitOfWork,
      productRepository,
      customerRepository,
      deliveryRepository,
      transactionRepository,
    );

    await useCase.execute(buildCommand());

    expect(runCallCount).toBe(1);
  });
});
