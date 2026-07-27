import { NotFoundException } from '@nestjs/common';
import { errAsync, okAsync } from 'neverthrow';
import { NotFoundError } from '../../../shared/domain/domain-error';
import { Customer } from '../../domain/customer.entity';
import { GetCustomerUseCase } from '../../application/get-customer.use-case';
import { CustomersController } from './customers.controller';

function buildCustomer(id: string) {
  return Customer.fromPersistence({
    id,
    email: 'jane@example.com',
    fullName: 'Jane Doe',
    phone: '+573001234567',
    legalId: null,
  });
}

describe('CustomersController', () => {
  it('getById() returns the customer when found', async () => {
    const getCustomer = {
      execute: jest.fn(() => okAsync(buildCustomer('1'))),
    } as unknown as GetCustomerUseCase;
    const controller = new CustomersController(getCustomer);

    const response = await controller.getById({ id: '1' });

    expect(response.id).toBe('1');
    expect(response.email).toBe('jane@example.com');
  });

  it('getById() throws NotFoundException when the use case fails with NotFoundError', async () => {
    const getCustomer = {
      execute: jest.fn(() => errAsync(new NotFoundError('Customer', 'missing'))),
    } as unknown as GetCustomerUseCase;
    const controller = new CustomersController(getCustomer);

    await expect(controller.getById({ id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
