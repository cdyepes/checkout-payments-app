import { Inject, Injectable } from '@nestjs/common';
import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../shared/domain/domain-error';
import { Product } from '../domain/product.entity';
import { PRODUCT_REPOSITORY, ProductRepository } from '../domain/product.repository.port';

@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepository: ProductRepository,
  ) {}

  execute(): ResultAsync<Product[], DomainError> {
    return this.productRepository.findAll();
  }
}
