import { Delivery as PrismaDelivery } from '@prisma/client';
import { Delivery } from '../../domain/delivery.entity';

export class DeliveryMapper {
  static toDomain(row: PrismaDelivery): Delivery {
    return Delivery.fromPersistence({
      id: row.id,
      transactionId: row.transactionId,
      customerId: row.customerId,
      addressLine: row.addressLine,
      city: row.city,
      region: row.region,
      country: row.country,
      postalCode: row.postalCode,
      feeInCents: row.feeInCents,
      status: row.status,
      assignedProductId: row.assignedProductId,
      quantity: row.quantity,
    });
  }
}
