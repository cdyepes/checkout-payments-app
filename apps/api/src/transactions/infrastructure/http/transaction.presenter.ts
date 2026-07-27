import { TransactionResponse } from '@checkout/contracts';
import { Transaction } from '../../domain/transaction.entity';

export class TransactionPresenter {
  static toResponse(transaction: Transaction): TransactionResponse {
    return {
      id: transaction.id,
      reference: transaction.reference,
      status: transaction.status,
      productId: transaction.productId,
      customerId: transaction.customerId,
      quantity: transaction.quantity,
      productAmountInCents: transaction.productAmountInCents,
      baseFeeInCents: transaction.baseFeeInCents,
      deliveryFeeInCents: transaction.deliveryFeeInCents,
      totalAmountInCents: transaction.totalAmountInCents,
      currency: transaction.currency as 'COP',
      providerTransactionId: transaction.providerTransactionId,
      providerStatus: transaction.providerStatus,
      failureReason: transaction.failureReason,
    };
  }
}
