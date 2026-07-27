import { Injectable } from '@nestjs/common';
import { ResultAsync } from 'neverthrow';
import { DomainError, UnexpectedError } from '../../../shared/domain/domain-error';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { Transaction, TransactionProps } from '../../domain/transaction.entity';
import { TransactionRepository } from '../../domain/transaction.repository.port';
import { TransactionMapper } from './transaction.mapper';

@Injectable()
export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): ResultAsync<Transaction | null, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().transaction.findUnique({ where: { id } }),
      (error) =>
        new UnexpectedError(`Failed to fetch transaction ${id}: ${(error as Error).message}`),
    ).map((row) => (row ? TransactionMapper.toDomain(row) : null));
  }

  create(props: Omit<TransactionProps, 'id'>): ResultAsync<Transaction, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().transaction.create({ data: props }),
      (error) => new UnexpectedError(`Failed to create transaction: ${(error as Error).message}`),
    ).map(TransactionMapper.toDomain);
  }

  updateStatus(
    id: string,
    update: Pick<TransactionProps, 'status' | 'providerStatus' | 'failureReason'>,
  ): ResultAsync<Transaction, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().transaction.update({ where: { id }, data: update }),
      (error) =>
        new UnexpectedError(`Failed to update transaction ${id}: ${(error as Error).message}`),
    ).map(TransactionMapper.toDomain);
  }
}
