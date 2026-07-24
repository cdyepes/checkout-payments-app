import { Injectable } from '@nestjs/common';
import { okAsync, ResultAsync } from 'neverthrow';
import { DomainError, UnexpectedError } from '../../../shared/domain/domain-error';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { Customer, CustomerProps } from '../../domain/customer.entity';
import { CustomerRepository } from '../../domain/customer.repository.port';
import { CustomerMapper } from './customer.mapper';

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): ResultAsync<Customer | null, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().customer.findUnique({ where: { id } }),
      (error) => new UnexpectedError(`Failed to fetch customer ${id}: ${(error as Error).message}`),
    ).map((row) => (row ? CustomerMapper.toDomain(row) : null));
  }

  findOrCreateByEmail(props: Omit<CustomerProps, 'id'>): ResultAsync<Customer, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().customer.findFirst({ where: { email: props.email } }),
      (error) =>
        new UnexpectedError(`Failed to look up customer by email: ${(error as Error).message}`),
    ).andThen((existing) => {
      if (existing) {
        return okAsync(CustomerMapper.toDomain(existing));
      }

      return ResultAsync.fromPromise(
        this.prisma.client().customer.create({ data: props }),
        (error) => new UnexpectedError(`Failed to create customer: ${(error as Error).message}`),
      ).map(CustomerMapper.toDomain);
    });
  }
}
