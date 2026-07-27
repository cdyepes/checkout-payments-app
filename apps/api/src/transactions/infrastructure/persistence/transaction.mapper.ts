import { Transaction as PrismaTransaction } from '@prisma/client';
import { Transaction } from '../../domain/transaction.entity';

export class TransactionMapper {
  static toDomain(row: PrismaTransaction): Transaction {
    return Transaction.fromPersistence({
      id: row.id,
      reference: row.reference,
      status: row.status,
      productId: row.productId,
      customerId: row.customerId,
      quantity: row.quantity,
      productAmountInCents: row.productAmountInCents,
      baseFeeInCents: row.baseFeeInCents,
      deliveryFeeInCents: row.deliveryFeeInCents,
      totalAmountInCents: row.totalAmountInCents,
      currency: row.currency,
      providerTransactionId: row.providerTransactionId,
      providerStatus: row.providerStatus,
      failureReason: row.failureReason,
    });
  }
}
