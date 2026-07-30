import { Delivery as PrismaDelivery } from '@prisma/client';
import { UnexpectedError } from '../../../shared/domain/domain-error';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { PrismaDeliveryRepository } from './prisma-delivery.repository';

function buildRow(overrides: Partial<PrismaDelivery> = {}): PrismaDelivery {
  return {
    id: 'delivery-1',
    transactionId: 'transaction-1',
    customerId: 'customer-1',
    addressLine: 'Calle 123 #45-67',
    city: 'Bogotá',
    region: 'Cundinamarca',
    country: 'CO',
    postalCode: null,
    feeInCents: 800000,
    status: 'PENDING',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function buildPrisma(client: Record<string, unknown>): PrismaService {
  return { client: () => client } as unknown as PrismaService;
}

describe('PrismaDeliveryRepository', () => {
  it('findById() returns null when no row matches', async () => {
    const prisma = buildPrisma({ delivery: { findUnique: jest.fn().mockResolvedValue(null) } });
    const repository = new PrismaDeliveryRepository(prisma);

    const result = await repository.findById('missing');

    expect(result._unsafeUnwrap()).toBeNull();
  });

  it('findById() maps a matching row', async () => {
    const prisma = buildPrisma({ delivery: { findUnique: jest.fn().mockResolvedValue(buildRow()) } });
    const repository = new PrismaDeliveryRepository(prisma);

    const result = await repository.findById('delivery-1');

    expect(result._unsafeUnwrap()?.id).toBe('delivery-1');
  });

  it('findById() wraps a Prisma failure', async () => {
    const prisma = buildPrisma({ delivery: { findUnique: jest.fn().mockRejectedValue(new Error('down')) } });
    const repository = new PrismaDeliveryRepository(prisma);

    const result = await repository.findById('delivery-1');

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
  });

  it('findByTransactionId() maps a matching row', async () => {
    const prisma = buildPrisma({ delivery: { findUnique: jest.fn().mockResolvedValue(buildRow()) } });
    const repository = new PrismaDeliveryRepository(prisma);

    const result = await repository.findByTransactionId('transaction-1');

    expect(result._unsafeUnwrap()?.transactionId).toBe('transaction-1');
  });

  it('findByTransactionId() wraps a Prisma failure', async () => {
    const prisma = buildPrisma({ delivery: { findUnique: jest.fn().mockRejectedValue(new Error('down')) } });
    const repository = new PrismaDeliveryRepository(prisma);

    const result = await repository.findByTransactionId('transaction-1');

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
  });

  it('create() persists and maps the created row', async () => {
    const create = jest.fn().mockResolvedValue(buildRow({ id: 'delivery-2' }));
    const prisma = buildPrisma({ delivery: { create } });
    const repository = new PrismaDeliveryRepository(prisma);
    const props = {
      transactionId: 'transaction-1',
      customerId: 'customer-1',
      addressLine: 'Calle 123 #45-67',
      city: 'Bogotá',
      region: 'Cundinamarca',
      country: 'CO',
      postalCode: null,
      feeInCents: 800000,
      status: 'PENDING' as const,
    };

    const result = await repository.create(props);

    expect(result._unsafeUnwrap().id).toBe('delivery-2');
    expect(create).toHaveBeenCalledWith({ data: props });
  });

  it('create() wraps a Prisma failure', async () => {
    const prisma = buildPrisma({
      delivery: { create: jest.fn().mockRejectedValue(new Error('constraint violation')) },
    });
    const repository = new PrismaDeliveryRepository(prisma);

    const result = await repository.create({
      transactionId: 'transaction-1',
      customerId: 'customer-1',
      addressLine: 'Calle 123 #45-67',
      city: 'Bogotá',
      region: 'Cundinamarca',
      country: 'CO',
      postalCode: null,
      feeInCents: 800000,
      status: 'PENDING',
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
  });

  it('markAssigned() marks the delivery ASSIGNED', async () => {
    const update = jest.fn().mockResolvedValue(buildRow({ status: 'ASSIGNED' }));
    const prisma = buildPrisma({ delivery: { update } });
    const repository = new PrismaDeliveryRepository(prisma);

    const result = await repository.markAssigned('delivery-1');

    expect(result._unsafeUnwrap().status).toBe('ASSIGNED');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'delivery-1' },
      data: { status: 'ASSIGNED' },
    });
  });

  it('markAssigned() wraps a Prisma failure', async () => {
    const prisma = buildPrisma({
      delivery: { update: jest.fn().mockRejectedValue(new Error('not found')) },
    });
    const repository = new PrismaDeliveryRepository(prisma);

    const result = await repository.markAssigned('delivery-1');

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
  });
});
