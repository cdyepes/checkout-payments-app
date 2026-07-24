import { NotFoundException } from '@nestjs/common';
import { errAsync, okAsync } from 'neverthrow';
import { NotFoundError } from '../../../shared/domain/domain-error';
import { Delivery } from '../../domain/delivery.entity';
import { GetDeliveryUseCase } from '../../application/get-delivery.use-case';
import { DeliveriesController } from './deliveries.controller';

function buildDelivery(id: string) {
  return Delivery.fromPersistence({
    id,
    transactionId: 'transaction-1',
    customerId: 'customer-1',
    addressLine: 'Calle 123 #45-67',
    city: 'Bogotá',
    region: 'Cundinamarca',
    country: 'CO',
    postalCode: null,
    feeInCents: 800000,
    status: 'PENDING',
    assignedProductId: null,
    quantity: 1,
  });
}

describe('DeliveriesController', () => {
  it('getById() returns the delivery when found', async () => {
    const getDelivery = {
      execute: jest.fn(() => okAsync(buildDelivery('1'))),
    } as unknown as GetDeliveryUseCase;
    const controller = new DeliveriesController(getDelivery);

    const response = await controller.getById({ id: '1' });

    expect(response.id).toBe('1');
    expect(response.city).toBe('Bogotá');
  });

  it('getById() throws NotFoundException when the use case fails with NotFoundError', async () => {
    const getDelivery = {
      execute: jest.fn(() => errAsync(new NotFoundError('Delivery', 'missing'))),
    } as unknown as GetDeliveryUseCase;
    const controller = new DeliveriesController(getDelivery);

    await expect(controller.getById({ id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
