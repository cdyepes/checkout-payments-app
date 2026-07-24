import { Delivery } from './delivery.entity';

describe('Delivery', () => {
  it('exposes its persisted properties', () => {
    const delivery = Delivery.fromPersistence({
      id: 'delivery-1',
      transactionId: 'transaction-1',
      customerId: 'customer-1',
      addressLine: 'Calle 123 #45-67',
      city: 'Bogotá',
      region: 'Cundinamarca',
      country: 'CO',
      postalCode: '110111',
      feeInCents: 500000,
      status: 'PENDING',
      assignedProductId: null,
      quantity: 1,
    });

    expect(delivery.id).toBe('delivery-1');
    expect(delivery.transactionId).toBe('transaction-1');
    expect(delivery.status).toBe('PENDING');
    expect(delivery.feeInCents).toBe(500000);
  });
});
