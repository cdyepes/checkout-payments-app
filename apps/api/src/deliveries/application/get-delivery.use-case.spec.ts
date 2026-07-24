import { errAsync, okAsync } from 'neverthrow';
import { NotFoundError, UnexpectedError } from '../../shared/domain/domain-error';
import { Delivery } from '../domain/delivery.entity';
import { DeliveryRepository } from '../domain/delivery.repository.port';
import { GetDeliveryUseCase } from './get-delivery.use-case';

function buildDelivery(id: string) {
  return Delivery.fromPersistence({
    id,
    transactionId: 'transaction-1',
    customerId: 'customer-1',
    addressLine: 'Calle 123 #45-67',
    city: 'Bogotá',
    region: 'Cundinamarca',
    country: 'CO',
    postalCode: null,
    feeInCents: 800000,
    status: 'PENDING',
    assignedProductId: null,
    quantity: 1,
  });
}

function buildRepository(overrides: Partial<DeliveryRepository> = {}): DeliveryRepository {
  return {
    findById: jest.fn(),
    findByTransactionId: jest.fn(),
    create: jest.fn(),
    assignProduct: jest.fn(),
    ...overrides,
  };
}

describe('GetDeliveryUseCase', () => {
  it('returns the delivery when it exists', async () => {
    const delivery = buildDelivery('1');
    const repository = buildRepository({ findById: jest.fn(() => okAsync(delivery)) });
    const useCase = new GetDeliveryUseCase(repository);

    const result = await useCase.execute({ id: '1' });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(delivery);
  });

  it('returns a NotFoundError when the repository finds nothing', async () => {
    const repository = buildRepository({ findById: jest.fn(() => okAsync(null)) });
    const useCase = new GetDeliveryUseCase(repository);

    const result = await useCase.execute({ id: 'missing' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it('propagates a repository failure', async () => {
    const error = new UnexpectedError('db down');
    const repository = buildRepository({ findById: jest.fn(() => errAsync(error)) });
    const useCase = new GetDeliveryUseCase(repository);

    const result = await useCase.execute({ id: '1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(error);
  });
});
