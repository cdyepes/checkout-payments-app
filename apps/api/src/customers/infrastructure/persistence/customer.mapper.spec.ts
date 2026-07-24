import { Customer as PrismaCustomer } from '@prisma/client';
import { CustomerMapper } from './customer.mapper';

describe('CustomerMapper', () => {
  it('maps a Prisma row to a domain Customer', () => {
    const row: PrismaCustomer = {
      id: 'customer-1',
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      phone: '+573001234567',
      legalId: '123456789',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const customer = CustomerMapper.toDomain(row);

    expect(customer.id).toBe(row.id);
    expect(customer.email).toBe(row.email);
    expect(customer.fullName).toBe(row.fullName);
    expect(customer.phone).toBe(row.phone);
    expect(customer.legalId).toBe(row.legalId);
  });

  it('maps a null legalId through', () => {
    const row: PrismaCustomer = {
      id: 'customer-1',
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      phone: '+573001234567',
      legalId: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    expect(CustomerMapper.toDomain(row).legalId).toBeNull();
  });
});
