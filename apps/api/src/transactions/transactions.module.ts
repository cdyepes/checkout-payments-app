import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { ProductsModule } from '../products/products.module';
import { CreateCheckoutTransactionUseCase } from './application/create-checkout-transaction.use-case';
import { GetTransactionUseCase } from './application/get-transaction.use-case';
import { TRANSACTION_REPOSITORY } from './domain/transaction.repository.port';
import { TransactionsController } from './infrastructure/http/transactions.controller';
import { PrismaTransactionRepository } from './infrastructure/persistence/prisma-transaction.repository';

@Module({
  imports: [ProductsModule, CustomersModule, DeliveriesModule],
  controllers: [TransactionsController],
  providers: [
    CreateCheckoutTransactionUseCase,
    GetTransactionUseCase,
    { provide: TRANSACTION_REPOSITORY, useClass: PrismaTransactionRepository },
  ],
  exports: [TRANSACTION_REPOSITORY],
})
export class TransactionsModule {}
