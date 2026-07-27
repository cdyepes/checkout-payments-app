import { DeliveryResponse } from '@checkout/contracts';
import { Delivery } from '../../domain/delivery.entity';

export class DeliveryPresenter {
  static toResponse(delivery: Delivery): DeliveryResponse {
    return {
      id: delivery.id,
      transactionId: delivery.transactionId,
      addressLine: delivery.addressLine,
      city: delivery.city,
      region: delivery.region,
      country: delivery.country,
      postalCode: delivery.postalCode,
      feeInCents: delivery.feeInCents,
      status: delivery.status,
      quantity: delivery.quantity,
    };
  }
}
