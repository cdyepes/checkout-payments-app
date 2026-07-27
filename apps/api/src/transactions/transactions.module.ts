import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { ProductsModule } from '../products/products.module';
import { PaymentsModule } from '../payments/payments.module';
import { CreateCheckoutTransactionUseCase } from './application/create-checkout-transaction.use-case';
import { ReconcileTransactionUseCase } from './application/reconcile-transaction.use-case';
import { SubmitTransactionPaymentUseCase } from './application/submit-transaction-payment.use-case';
import { TRANSACTION_REPOSITORY } from './domain/transaction.repository.port';
import { TransactionsController } from './infrastructure/http/transactions.controller';
import { PrismaTransactionRepository } from './infrastructure/persistence/prisma-transaction.repository';

@Module({
  imports: [ProductsModule, CustomersModule, DeliveriesModule, PaymentsModule],
  controllers: [TransactionsController],
  providers: [
    CreateCheckoutTransactionUseCase,
    SubmitTransactionPaymentUseCase,
    ReconcileTransactionUseCase,
    { provide: TRANSACTION_REPOSITORY, useClass: PrismaTransactionRepository },
  ],
  exports: [TRANSACTION_REPOSITORY],
})
export class TransactionsModule {}
