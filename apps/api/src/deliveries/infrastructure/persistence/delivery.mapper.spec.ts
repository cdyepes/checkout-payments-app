import { Delivery as PrismaDelivery } from '@prisma/client';
import { DeliveryMapper } from './delivery.mapper';

describe('DeliveryMapper', () => {
  it('maps a Prisma row to a domain Delivery', () => {
    const row: PrismaDelivery = {
      id: 'delivery-1',
      transactionId: 'transaction-1',
      customerId: 'customer-1',
      addressLine: 'Calle 123 #45-67',
      city: 'Bogotá',
      region: 'Cundinamarca',
      country: 'CO',
      postalCode: '110111',
      feeInCents: 800000,
      status: 'PENDING',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const delivery = DeliveryMapper.toDomain(row);

    expect(delivery.id).toBe(row.id);
    expect(delivery.transactionId).toBe(row.transactionId);
    expect(delivery.customerId).toBe(row.customerId);
    expect(delivery.addressLine).toBe(row.addressLine);
    expect(delivery.city).toBe(row.city);
    expect(delivery.region).toBe(row.region);
    expect(delivery.country).toBe(row.country);
    expect(delivery.postalCode).toBe(row.postalCode);
    expect(delivery.feeInCents).toBe(row.feeInCents);
    expect(delivery.status).toBe(row.status);
  });
});
