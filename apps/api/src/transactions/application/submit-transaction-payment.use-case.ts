import { Inject, Injectable } from '@nestjs/common';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { ConflictError, DomainError, NotFoundError } from '../../shared/domain/domain-error';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepository,
} from '../../customers/domain/customer.repository.port';
import {
  PAYMENT_GATEWAY,
  PaymentGateway,
} from '../../payments/domain/payment-gateway.port';
import { Transaction } from '../domain/transaction.entity';
import { TRANSACTION_REPOSITORY, TransactionRepository } from '../domain/transaction.repository.port';

export interface SubmitTransactionPaymentCommand {
  transactionId: string;
  cardToken: string;
}

@Injectable()
export class SubmitTransactionPaymentUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepository: TransactionRepository,
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepository: CustomerRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

  execute(command: SubmitTransactionPaymentCommand): ResultAsync<Transaction, DomainError> {
    return this.transactionRepository
      .findById(command.transactionId)
      .andThen((transaction) =>
        transaction
          ? okAsync(transaction)
          : errAsync(new NotFoundError('Transaction', command.transactionId)),
      )
      .andThen((transaction) => this.guardSubmittable(transaction))
      .andThen((transaction) => this.attachCustomer(transaction))
      .andThen(({ transaction, customer }) =>
        this.paymentGateway
          .createTransaction({
            reference: transaction.reference,
            amountInCents: transaction.totalAmountInCents,
            currency: transaction.currency,
            cardToken: command.cardToken,
            customerEmail: customer.email,
          })
          .map((gatewayTransaction) => ({ transaction, gatewayTransaction })),
      )
      .andThen(({ transaction, gatewayTransaction }) =>
        // A newly created gateway transaction is always PENDING (per provider docs); the
        // domain status only moves once ReconcileTransactionUseCase applies the settled
        // outcome, so delivery/stock side effects always happen through that single path.
        this.transactionRepository.updateStatus(transaction.id, {
          status: 'PENDING',
          providerStatus: gatewayTransaction.status,
          providerTransactionId: gatewayTransaction.id,
          failureReason: null,
        }),
      );
  }

  private guardSubmittable(transaction: Transaction): ResultAsync<Transaction, DomainError> {
    if (transaction.status !== 'PENDING') {
      return errAsync(
        new ConflictError(`Transaction "${transaction.id}" is already ${transaction.status}`),
      );
    }
    if (transaction.providerTransactionId) {
      return errAsync(
        new ConflictError(`Transaction "${transaction.id}" has already been submitted for payment`),
      );
    }
    return okAsync(transaction);
  }

  private attachCustomer(
    transaction: Transaction,
  ): ResultAsync<{ transaction: Transaction; customer: { email: string } }, DomainError> {
    return this.customerRepository
      .findById(transaction.customerId)
      .andThen((customer) =>
        customer
          ? okAsync(customer)
          : errAsync(new NotFoundError('Customer', transaction.customerId)),
      )
      .map((customer) => ({ transaction, customer }));
  }
}
