import { Module } from '@nestjs/common';
import { GetCustomerUseCase } from './application/get-customer.use-case';
import { CUSTOMER_REPOSITORY } from './domain/customer.repository.port';
import { CustomersController } from './infrastructure/http/customers.controller';
import { PrismaCustomerRepository } from './infrastructure/persistence/prisma-customer.repository';

@Module({
  controllers: [CustomersController],
  providers: [
    GetCustomerUseCase,
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
  ],
  exports: [CUSTOMER_REPOSITORY],
})
export class CustomersModule {}
