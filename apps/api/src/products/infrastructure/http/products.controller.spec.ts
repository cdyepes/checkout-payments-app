import { NotFoundException } from '@nestjs/common';
import { errAsync, okAsync } from 'neverthrow';
import { NotFoundError } from '../../../shared/domain/domain-error';
import { Product } from '../../domain/product.entity';
import { GetProductUseCase } from '../../application/get-product.use-case';
import { ListProductsUseCase } from '../../application/list-products.use-case';
import { ProductsController } from './products.controller';

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

describe('ProductsController', () => {
  it('list() returns products serialized for the wire', async () => {
    const listProducts = { execute: jest.fn(() => okAsync([buildProduct('1')])) } as unknown as ListProductsUseCase;
    const getProduct = {} as GetProductUseCase;
    const controller = new ProductsController(listProducts, getProduct);

    const response = await controller.list();

    expect(response).toEqual([
      {
        id: '1',
        name: 'Keyboard',
        description: 'A keyboard',
        imageUrl: 'https://example.com/keyboard.jpg',
        priceInCents: 10000,
        currency: 'COP',
        stock: 5,
      },
    ]);
  });

  it('getById() returns the product when found', async () => {
    const listProducts = {} as ListProductsUseCase;
    const getProduct = { execute: jest.fn(() => okAsync(buildProduct('1'))) } as unknown as GetProductUseCase;
    const controller = new ProductsController(listProducts, getProduct);

    const response = await controller.getById({ id: '1' });

    expect(response.id).toBe('1');
  });

  it('getById() throws NotFoundException when the use case fails with NotFoundError', async () => {
    const listProducts = {} as ListProductsUseCase;
    const getProduct = {
      execute: jest.fn(() => errAsync(new NotFoundError('Product', 'missing'))),
    } as unknown as GetProductUseCase;
    const controller = new ProductsController(listProducts, getProduct);

    await expect(controller.getById({ id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
