import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../shared/domain/domain-error';
import { Product } from './product.entity';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductRepository {
  findAll(): ResultAsync<Product[], DomainError>;
  findById(id: string): ResultAsync<Product | null, DomainError>;
}
