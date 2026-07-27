import { errAsync, okAsync } from 'neverthrow';
import { UnexpectedError } from '../../shared/domain/domain-error';
import { Product } from '../domain/product.entity';
import { ProductRepository } from '../domain/product.repository.port';
import { ListProductsUseCase } from './list-products.use-case';

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

describe('ListProductsUseCase', () => {
  it('returns every product from the repository', async () => {
    const products = [buildProduct('1'), buildProduct('2')];
    const repository: ProductRepository = {
      findAll: jest.fn(() => okAsync(products)),
      findById: jest.fn(),
      decrementStock: jest.fn(),
    };
    const useCase = new ListProductsUseCase(repository);

    const result = await useCase.execute();

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(products);
  });

  it('propagates a repository failure', async () => {
    const error = new UnexpectedError('db down');
    const repository: ProductRepository = {
      findAll: jest.fn(() => errAsync(error)),
      findById: jest.fn(),
      decrementStock: jest.fn(),
    };
    const useCase = new ListProductsUseCase(repository);

    const result = await useCase.execute();

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(error);
  });
});
