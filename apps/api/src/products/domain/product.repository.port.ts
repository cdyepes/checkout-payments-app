import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../shared/domain/domain-error';
import { Product } from './product.entity';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductRepository {
  findAll(): ResultAsync<Product[], DomainError>;
  findById(id: string): ResultAsync<Product | null, DomainError>;
  /**
   * Returns the products matching `ids`, in unspecified order and with missing ids
   * simply absent — callers decide whether a gap is an error.
   */
  findManyByIds(ids: readonly string[]): ResultAsync<Product[], DomainError>;
  /**
   * Atomically decrements stock only if enough is available, so it can never go
   * negative under concurrent calls. Resolves `true` when the decrement applied,
   * `false` when there wasn't enough stock left.
   */
  decrementStock(id: string, quantity: number): ResultAsync<boolean, DomainError>;
}
