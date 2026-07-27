import { Inject, Injectable } from '@nestjs/common';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { DomainError, NotFoundError } from '../../shared/domain/domain-error';
import { Transaction } from '../domain/transaction.entity';
import { TRANSACTION_REPOSITORY, TransactionRepository } from '../domain/transaction.repository.port';

export interface GetTransactionQuery {
  id: string;
}

@Injectable()
export class GetTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepository: TransactionRepository,
  ) {}

  execute(query: GetTransactionQuery): ResultAsync<Transaction, DomainError> {
    return this.transactionRepository
      .findById(query.id)
      .andThen((transaction) =>
        transaction ? okAsync(transaction) : errAsync(new NotFoundError('Transaction', query.id)),
      );
  }
}
