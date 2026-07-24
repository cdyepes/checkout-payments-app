import { Module } from '@nestjs/common';
import { GetDeliveryUseCase } from './application/get-delivery.use-case';
import { DELIVERY_REPOSITORY } from './domain/delivery.repository.port';
import { DeliveriesController } from './infrastructure/http/deliveries.controller';
import { PrismaDeliveryRepository } from './infrastructure/persistence/prisma-delivery.repository';

@Module({
  controllers: [DeliveriesController],
  providers: [
    GetDeliveryUseCase,
    { provide: DELIVERY_REPOSITORY, useClass: PrismaDeliveryRepository },
  ],
  exports: [DELIVERY_REPOSITORY],
})
export class DeliveriesModule {}
