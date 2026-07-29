import { Inject, Injectable } from '@nestjs/common';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { DomainError, NotFoundError } from '../../shared/domain/domain-error';
import { UNIT_OF_WORK, UnitOfWork } from '../../shared/domain/unit-of-work';
import {
  DELIVERY_REPOSITORY,
  DeliveryRepository,
} from '../../deliveries/domain/delivery.repository.port';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../products/domain/product.repository.port';
import {
  GatewayTransaction,
  PAYMENT_GATEWAY,
  PaymentGateway,
} from '../../payments/domain/payment-gateway.port';
import { Transaction } from '../domain/transaction.entity';
import { TRANSACTION_REPOSITORY, TransactionRepository } from '../domain/transaction.repository.port';

export interface ReconcileTransactionCommand {
  transactionId: string;
}

@Injectable()
export class ReconcileTransactionUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepository: TransactionRepository,
    @Inject(DELIVERY_REPOSITORY) private readonly deliveryRepository: DeliveryRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepository: ProductRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

  execute(command: ReconcileTransactionCommand): ResultAsync<Transaction, DomainError> {
    return this.transactionRepository
      .findById(command.transactionId)
      .andThen((transaction) =>
        transaction
          ? okAsync(transaction)
          : errAsync(new NotFoundError('Transaction', command.transactionId)),
      )
      .andThen((transaction) => this.reconcileIfNeeded(transaction));
  }

  private reconcileIfNeeded(transaction: Transaction): ResultAsync<Transaction, DomainError> {
    if (transaction.status !== 'PENDING' || !transaction.providerTransactionId) {
      return okAsync(transaction);
    }

    return this.paymentGateway
      .getTransactionStatus(transaction.providerTransactionId)
      .andThen((gatewayTransaction) =>
        gatewayTransaction.status === 'PENDING'
          ? okAsync(transaction)
          : this.applySettlement(transaction, gatewayTransaction),
      );
  }

  private applySettlement(
    transaction: Transaction,
    gatewayTransaction: GatewayTransaction,
  ): ResultAsync<Transaction, DomainError> {
    return this.unitOfWork.run(() => this.settlePipeline(transaction, gatewayTransaction));
  }

  private settlePipeline(
    transaction: Transaction,
    gatewayTransaction: GatewayTransaction,
  ): ResultAsync<Transaction, DomainError> {
    return this.transactionRepository
      .settleIfPending(transaction.id, {
        status: gatewayTransaction.status,
        providerStatus: gatewayTransaction.status,
        providerTransactionId: transaction.providerTransactionId,
        failureReason:
          gatewayTransaction.status === 'APPROVED' ? null : `Provider status: ${gatewayTransaction.status}`,
      })
      .andThen((settled) => {
        if (!settled) {
          // A concurrent reconcile already settled this transaction first.
          return this.transactionRepository.findById(transaction.id).andThen((current) =>
            current ? okAsync(current) : errAsync(new NotFoundError('Transaction', transaction.id)),
          );
        }
        return gatewayTransaction.status === 'APPROVED'
          ? this.settleApproved(settled)
          : okAsync(settled);
      });
  }

  private settleApproved(transaction: Transaction): ResultAsync<Transaction, DomainError> {
    return this.deliveryRepository
      .findByTransactionId(transaction.id)
      .andThen((delivery) =>
        delivery
          ? okAsync(delivery)
          : errAsync(new NotFoundError('Delivery', transaction.id)),
      )
      .andThen((delivery) => this.deliveryRepository.assignProduct(delivery.id, transaction.productId))
      .andThen(() => this.productRepository.decrementStock(transaction.productId, transaction.quantity))
      .map(() => transaction);
  }
}
