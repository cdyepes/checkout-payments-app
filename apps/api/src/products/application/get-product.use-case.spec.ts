import { errAsync, okAsync } from 'neverthrow';
import { NotFoundError, UnexpectedError } from '../../shared/domain/domain-error';
import { Product } from '../domain/product.entity';
import { ProductRepository } from '../domain/product.repository.port';
import { GetProductUseCase } from './get-product.use-case';

function buildProduct(id: string) {
  return Product.fromPersistence({
    id,
    name: 'Keyboard',
    description: 'A keyboard',
    imageUrl: 'https://example.com/keyboard.jpg',
    priceInCents: 10000,
    currency: 'COP',
    stock: 5,
  });
}

describe('GetProductUseCase', () => {
  it('returns the product when it exists', async () => {
    const product = buildProduct('1');
    const repository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(() => okAsync(product)),
    };
    const useCase = new GetProductUseCase(repository);

    const result = await useCase.execute({ id: '1' });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(product);
  });

  it('returns a NotFoundError when the repository finds nothing', async () => {
    const repository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(() => okAsync(null)),
    };
    const useCase = new GetProductUseCase(repository);

    const result = await useCase.execute({ id: 'missing' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it('propagates a repository failure', async () => {
    const error = new UnexpectedError('db down');
    const repository: ProductRepository = {
      findAll: jest.fn(),
      findById: jest.fn(() => errAsync(error)),
    };
    const useCase = new GetProductUseCase(repository);

    const result = await useCase.execute({ id: '1' });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(error);
  });
});
