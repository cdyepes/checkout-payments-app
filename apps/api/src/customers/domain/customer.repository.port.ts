import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../shared/domain/domain-error';
import { Customer, CustomerProps } from './customer.entity';

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');

export interface CustomerRepository {
  findById(id: string): ResultAsync<Customer | null, DomainError>;
  findOrCreateByEmail(props: Omit<CustomerProps, 'id'>): ResultAsync<Customer, DomainError>;
}
