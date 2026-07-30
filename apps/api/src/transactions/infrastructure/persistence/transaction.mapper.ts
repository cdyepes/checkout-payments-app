import {
  Transaction as PrismaTransaction,
  TransactionItem as PrismaTransactionItem,
} from '@prisma/client';
import { Transaction } from '../../domain/transaction.entity';

export type TransactionRow = PrismaTransaction & { items: PrismaTransactionItem[] };

export class TransactionMapper {
  static toDomain(row: TransactionRow): Transaction {
    return Transaction.fromPersistence({
      id: row.id,
      reference: row.reference,
      status: row.status,
      customerId: row.customerId,
      items: row.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        subtotalInCents: item.subtotalInCents,
      })),
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
