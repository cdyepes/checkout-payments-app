import { TransactionResponse } from '@checkout/contracts';
import { Transaction } from '../../domain/transaction.entity';

export class TransactionPresenter {
  static toResponse(transaction: Transaction): TransactionResponse {
    return {
      id: transaction.id,
      reference: transaction.reference,
      status: transaction.status,
      customerId: transaction.customerId,
      items: transaction.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        subtotalInCents: item.subtotalInCents,
      })),
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
