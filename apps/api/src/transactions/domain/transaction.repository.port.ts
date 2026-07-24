import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../shared/domain/domain-error';
import { Transaction, TransactionProps } from './transaction.entity';

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');

export interface TransactionRepository {
  findById(id: string): ResultAsync<Transaction | null, DomainError>;
  create(props: Omit<TransactionProps, 'id'>): ResultAsync<Transaction, DomainError>;
  updateStatus(
    id: string,
    update: Pick<TransactionProps, 'status' | 'providerStatus' | 'failureReason'>,
  ): ResultAsync<Transaction, DomainError>;
}
