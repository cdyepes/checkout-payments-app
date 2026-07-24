import { Module } from '@nestjs/common';

// PaymentGateway port is in place; the HTTP adapter for the payment provider's
// sandbox API lands in the checkout iteration.
@Module({})
export class PaymentsModule {}
