import { Injectable } from '@nestjs/common';
import { ResultAsync } from 'neverthrow';
import { DomainError, UnexpectedError } from '../../../shared/domain/domain-error';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { Delivery, DeliveryProps } from '../../domain/delivery.entity';
import { DeliveryRepository } from '../../domain/delivery.repository.port';
import { DeliveryMapper } from './delivery.mapper';

@Injectable()
export class PrismaDeliveryRepository implements DeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): ResultAsync<Delivery | null, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().delivery.findUnique({ where: { id } }),
      (error) => new UnexpectedError(`Failed to fetch delivery ${id}: ${(error as Error).message}`),
    ).map((row) => (row ? DeliveryMapper.toDomain(row) : null));
  }

  findByTransactionId(transactionId: string): ResultAsync<Delivery | null, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().delivery.findUnique({ where: { transactionId } }),
      (error) =>
        new UnexpectedError(
          `Failed to fetch delivery for transaction ${transactionId}: ${(error as Error).message}`,
        ),
    ).map((row) => (row ? DeliveryMapper.toDomain(row) : null));
  }

  create(props: Omit<DeliveryProps, 'id'>): ResultAsync<Delivery, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().delivery.create({ data: props }),
      (error) => new UnexpectedError(`Failed to create delivery: ${(error as Error).message}`),
    ).map(DeliveryMapper.toDomain);
  }

  assignProduct(id: string, productId: string): ResultAsync<Delivery, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().delivery.update({
        where: { id },
        data: { assignedProductId: productId, status: 'ASSIGNED' },
      }),
      (error) =>
        new UnexpectedError(`Failed to assign product to delivery ${id}: ${(error as Error).message}`),
    ).map(DeliveryMapper.toDomain);
  }
}
