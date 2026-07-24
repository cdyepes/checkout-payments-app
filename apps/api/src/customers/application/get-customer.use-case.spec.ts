import { errAsync, okAsync } from 'neverthrow';
import { NotFoundError, UnexpectedError } from '../../shared/domain/domain-error';
import { Customer } from '../domain/customer.entity';
import { CustomerRepository } from '../domain/customer.repository.port';
import { GetCustomerUseCase } from './get-customer.use-case';

function buildCustomer(id: string) {
  return Customer.fromPersistence({
    id,
    email: 'jane@example.com',
    fullName: 'Jane Doe',
    phone: '+573001234567',
    legalId: null,
  });
}

describe('GetCustomerUseCase', () => {
  it('returns the customer when it exists', async () => {
    const customer = buildCustomer('1');
    const repository: CustomerRepository = {
      findById: jest.fn(() => okAsync(customer)),
      findOrCreateByEmail: jest.fn(),
    };
    const useCase = new GetCustomerUseCase(repository);

    const result = await useCase.execute({ id: '1' });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(customer);
  });

  it('returns a NotFoundError when the repository finds nothing', async () => {
    const repository: CustomerRepository = {
      findById: jest.fn(() => okAsync(null)),
      findOrCreateByEmail: jest.fn(),
    };
    const useCase = new GetCustomerUseCase(repository);

    const result = await useCase.execute({ id: 'missing' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it('propagates a repository failure', async () => {
    const error = new UnexpectedError('db down');
    const repository: CustomerRepository = {
      findById: jest.fn(() => errAsync(error)),
      findOrCreateByEmail: jest.fn(),
    };
    const useCase = new GetCustomerUseCase(repository);

    const result = await useCase.execute({ id: '1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(error);
  });
});
