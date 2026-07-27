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
    assignedProductId: null,
    quantity: 2,
  });
}

function buildCommand(
  overrides: Partial<CreateCheckoutTransactionCommand> = {},
): CreateCheckoutTransactionCommand {
  return {
    productId: 'product-1',
    quantity: 2,
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
      findById: jest.fn(() => okAsync(product)),
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
    };
    const createDelivery = jest.fn(() => okAsync(delivery));
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: createDelivery,
      assignProduct: jest.fn(),
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
      productId: 'product-1',
      customerId: 'customer-1',
      quantity: 2,
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
        quantity: 2,
      }),
    );
  });

  it('fails with NotFoundError when the product does not exist', async () => {
    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(() => okAsync(null)),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(),
    };
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(),
      assignProduct: jest.fn(),
    };
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };

    const useCase = new CreateCheckoutTransactionUseCase(
      passthroughUnitOfWork,
      productRepository,
      customerRepository,
      deliveryRepository,
      transactionRepository,
    );

    const result = await useCase.execute(buildCommand({ productId: 'missing' }));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    expect(customerRepository.findOrCreateByEmail).not.toHaveBeenCalled();
  });

  it('fails with InsufficientStockError when stock is too low', async () => {
    const product = buildProduct({ stock: 1 });
    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(() => okAsync(product)),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(),
    };
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(),
      assignProduct: jest.fn(),
    };
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };

    const useCase = new CreateCheckoutTransactionUseCase(
      passthroughUnitOfWork,
      productRepository,
      customerRepository,
      deliveryRepository,
      transactionRepository,
    );

    const result = await useCase.execute(buildCommand({ quantity: 3 }));

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(InsufficientStockError);
    expect((error as InsufficientStockError).available).toBe(1);
    expect((error as InsufficientStockError).requested).toBe(3);
    expect(customerRepository.findOrCreateByEmail).not.toHaveBeenCalled();
  });

  it('fails with InsufficientStockError for a zero or negative quantity', async () => {
    const product = buildProduct({ stock: 5 });
    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(() => okAsync(product)),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(),
    };
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(),
      assignProduct: jest.fn(),
    };
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };

    const useCase = new CreateCheckoutTransactionUseCase(
      passthroughUnitOfWork,
      productRepository,
      customerRepository,
      deliveryRepository,
      transactionRepository,
    );

    const result = await useCase.execute(buildCommand({ quantity: 0 }));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(InsufficientStockError);
  });

  it('propagates a customer repository failure without creating a transaction', async () => {
    const product = buildProduct({ stock: 5 });
    const error = new UnexpectedError('db down');
    const productRepository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(() => okAsync(product)),
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
      assignProduct: jest.fn(),
    };
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: createTransaction,
      updateStatus: jest.fn(),
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
      findById: jest.fn(() => okAsync(product)),
    };
    const customerRepository: CustomerRepository = {
      findById: jest.fn(),
      findOrCreateByEmail: jest.fn(() => okAsync(customer)),
    };
    const transactionRepository: TransactionRepository = {
      findById: jest.fn(),
      create: jest.fn(() => okAsync(transaction)),
      updateStatus: jest.fn(),
    };
    const deliveryRepository: DeliveryRepository = {
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
      create: jest.fn(() => okAsync(delivery)),
      assignProduct: jest.fn(),
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
