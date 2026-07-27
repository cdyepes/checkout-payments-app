import { Inject, Injectable } from '@nestjs/common';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { DomainError, NotFoundError } from '../../shared/domain/domain-error';
import { Customer } from '../domain/customer.entity';
import { CUSTOMER_REPOSITORY, CustomerRepository } from '../domain/customer.repository.port';

export interface GetCustomerQuery {
  id: string;
}

@Injectable()
export class GetCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepository: CustomerRepository,
  ) {}

  execute(query: GetCustomerQuery): ResultAsync<Customer, DomainError> {
    return this.customerRepository
      .findById(query.id)
      .andThen((customer) =>
        customer ? okAsync(customer) : errAsync(new NotFoundError('Customer', query.id)),
      );
  }
}
