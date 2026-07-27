import { Customer as PrismaCustomer } from '@prisma/client';
import { UnexpectedError } from '../../../shared/domain/domain-error';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { PrismaCustomerRepository } from './prisma-customer.repository';

function buildRow(overrides: Partial<PrismaCustomer> = {}): PrismaCustomer {
  return {
    id: 'customer-1',
    email: 'jane@example.com',
    fullName: 'Jane Doe',
    phone: '+573001234567',
    legalId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function buildPrisma(client: Record<string, unknown>): PrismaService {
  return { client: () => client } as unknown as PrismaService;
}

describe('PrismaCustomerRepository', () => {
  describe('findById', () => {
    it('returns null when no row matches', async () => {
      const prisma = buildPrisma({ customer: { findUnique: jest.fn().mockResolvedValue(null) } });
      const repository = new PrismaCustomerRepository(prisma);

      const result = await repository.findById('missing');

      expect(result._unsafeUnwrap()).toBeNull();
    });

    it('maps a matching row to a domain Customer', async () => {
      const prisma = buildPrisma({
        customer: { findUnique: jest.fn().mockResolvedValue(buildRow()) },
      });
      const repository = new PrismaCustomerRepository(prisma);

      const result = await repository.findById('customer-1');

      expect(result._unsafeUnwrap()?.email).toBe('jane@example.com');
    });

    it('wraps a Prisma failure in UnexpectedError', async () => {
      const prisma = buildPrisma({
        customer: { findUnique: jest.fn().mockRejectedValue(new Error('down')) },
      });
      const repository = new PrismaCustomerRepository(prisma);

      const result = await repository.findById('customer-1');

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
    });
  });

  describe('findOrCreateByEmail', () => {
    const input = {
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      phone: '+573001234567',
      legalId: null,
    };

    it('returns the existing customer without creating a new one', async () => {
      const create = jest.fn();
      const prisma = buildPrisma({
        customer: { findFirst: jest.fn().mockResolvedValue(buildRow()), create },
      });
      const repository = new PrismaCustomerRepository(prisma);

      const result = await repository.findOrCreateByEmail(input);

      expect(result._unsafeUnwrap().id).toBe('customer-1');
      expect(create).not.toHaveBeenCalled();
    });

    it('creates a new customer when none exists with that email', async () => {
      const create = jest.fn().mockResolvedValue(buildRow({ id: 'customer-2' }));
      const prisma = buildPrisma({
        customer: { findFirst: jest.fn().mockResolvedValue(null), create },
      });
      const repository = new PrismaCustomerRepository(prisma);

      const result = await repository.findOrCreateByEmail(input);

      expect(result._unsafeUnwrap().id).toBe('customer-2');
      expect(create).toHaveBeenCalledWith({ data: input });
    });

    it('wraps a lookup failure in UnexpectedError', async () => {
      const prisma = buildPrisma({
        customer: { findFirst: jest.fn().mockRejectedValue(new Error('down')) },
      });
      const repository = new PrismaCustomerRepository(prisma);

      const result = await repository.findOrCreateByEmail(input);

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
    });

    it('wraps a create failure in UnexpectedError', async () => {
      const prisma = buildPrisma({
        customer: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockRejectedValue(new Error('constraint violation')),
        },
      });
      const repository = new PrismaCustomerRepository(prisma);

      const result = await repository.findOrCreateByEmail(input);

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(UnexpectedError);
    });
  });
});
