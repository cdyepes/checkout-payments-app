import { Injectable } from '@nestjs/common';
import { okAsync, ResultAsync } from 'neverthrow';
import { DomainError, UnexpectedError } from '../../../shared/domain/domain-error';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { Transaction, TransactionProps } from '../../domain/transaction.entity';
import { TransactionRepository } from '../../domain/transaction.repository.port';
import { TransactionMapper } from './transaction.mapper';

/**
 * Every read path must hydrate the aggregate's line items — TransactionMapper.toDomain
 * requires them. Ordered by productId so responses (and the settlement decrement order
 * in ReconcileTransactionUseCase) are deterministic.
 */
const TRANSACTION_INCLUDE = {
  items: { orderBy: { productId: 'asc' as const } },
} as const;

@Injectable()
export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): ResultAsync<Transaction | null, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().transaction.findUnique({ where: { id }, include: TRANSACTION_INCLUDE }),
      (error) =>
        new UnexpectedError(`Failed to fetch transaction ${id}: ${(error as Error).message}`),
    ).map((row) => (row ? TransactionMapper.toDomain(row) : null));
  }

  create(props: Omit<TransactionProps, 'id'>): ResultAsync<Transaction, DomainError> {
    const { items, ...scalars } = props;

    return ResultAsync.fromPromise(
      this.prisma.client().transaction.create({
        data: {
          ...scalars,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPriceInCents: item.unitPriceInCents,
              subtotalInCents: item.subtotalInCents,
            })),
          },
        },
        include: TRANSACTION_INCLUDE,
      }),
      (error) => new UnexpectedError(`Failed to create transaction: ${(error as Error).message}`),
    ).map(TransactionMapper.toDomain);
  }

  updateStatus(
    id: string,
    update: Pick<
      TransactionProps,
      'status' | 'providerStatus' | 'failureReason' | 'providerTransactionId'
    >,
  ): ResultAsync<Transaction, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().transaction.update({
        where: { id },
        data: update,
        include: TRANSACTION_INCLUDE,
      }),
      (error) =>
        new UnexpectedError(`Failed to update transaction ${id}: ${(error as Error).message}`),
    ).map(TransactionMapper.toDomain);
  }

  settleIfPending(
    id: string,
    update: Pick<
      TransactionProps,
      'status' | 'providerStatus' | 'failureReason' | 'providerTransactionId'
    >,
  ): ResultAsync<Transaction | null, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().transaction.updateMany({
        where: { id, status: 'PENDING' },
        data: update,
      }),
      (error) =>
        new UnexpectedError(`Failed to settle transaction ${id}: ${(error as Error).message}`),
    ).andThen((result) => (result.count > 0 ? this.findById(id) : okAsync(null)));
  }
}
