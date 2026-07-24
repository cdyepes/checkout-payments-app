import { Inject, Injectable } from '@nestjs/common';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { DomainError, NotFoundError } from '../../shared/domain/domain-error';
import { Product } from '../domain/product.entity';
import { PRODUCT_REPOSITORY, ProductRepository } from '../domain/product.repository.port';

export interface GetProductQuery {
  id: string;
}

@Injectable()
export class GetProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepository: ProductRepository,
  ) {}

  execute(query: GetProductQuery): ResultAsync<Product, DomainError> {
    return this.productRepository
      .findById(query.id)
      .andThen((product) =>
        product ? okAsync(product) : errAsync(new NotFoundError('Product', query.id)),
      );
  }
}
