import { Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from './domain/payment-gateway.port';
import { HttpPaymentGateway } from './infrastructure/http/http-payment-gateway';

@Module({
  providers: [{ provide: PAYMENT_GATEWAY, useClass: HttpPaymentGateway }],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentsModule {}
