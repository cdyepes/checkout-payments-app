import { Customer } from './customer.entity';

describe('Customer', () => {
  it('exposes its persisted properties', () => {
    const customer = Customer.fromPersistence({
      id: 'customer-1',
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      phone: '+573001234567',
      legalId: '123456789',
    });

    expect(customer.id).toBe('customer-1');
    expect(customer.email).toBe('jane@example.com');
    expect(customer.fullName).toBe('Jane Doe');
    expect(customer.phone).toBe('+573001234567');
    expect(customer.legalId).toBe('123456789');
  });

  it('allows a null legalId', () => {
    const customer = Customer.fromPersistence({
      id: 'customer-2',
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      phone: '+573001234567',
      legalId: null,
    });

    expect(customer.legalId).toBeNull();
  });
});
