import { Injectable } from '@nestjs/common';
import { ResultAsync } from 'neverthrow';
import { UnitOfWork } from '../../domain/unit-of-work';
import { PrismaService } from './prisma.service';
import { PrismaTransactionContext } from './prisma-transaction-context';

/**
 * Carries a domain Err out of prisma.$transaction's callback as a thrown value —
 * throwing is the only way to make Prisma actually roll back, since a resolved Err
 * is indistinguishable from success to the underlying driver.
 */
class Rollback<E> extends Error {
  constructor(readonly reason: E) {
    super('UnitOfWork rolled back');
  }
}

@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txContext: PrismaTransactionContext,
  ) {}

  run<T, E>(work: () => ResultAsync<T, E>): ResultAsync<T, E> {
    return ResultAsync.fromPromise(
      this.prisma.$transaction((tx) =>
        this.txContext.run(tx, async () => {
          const result = await work();
          if (result.isErr()) throw new Rollback(result.error);
          return result.value;
        }),
      ),
      (error) => (error instanceof Rollback ? (error.reason as E) : (error as E)),
    );
  }
}
