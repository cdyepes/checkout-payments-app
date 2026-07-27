import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../shared/domain/domain-error';
import { Product } from './product.entity';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductRepository {
  findAll(): ResultAsync<Product[], DomainError>;
  findById(id: string): ResultAsync<Product | null, DomainError>;
  /**
   * Atomically decrements stock only if enough is available, so it can never go
   * negative under concurrent calls. Resolves `true` when the decrement applied,
   * `false` when there wasn't enough stock left.
   */
  decrementStock(id: string, quantity: number): ResultAsync<boolean, DomainError>;
}
