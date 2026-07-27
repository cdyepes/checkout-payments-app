import { Inject, Injectable } from '@nestjs/common';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { DomainError, NotFoundError } from '../../shared/domain/domain-error';
import { Delivery } from '../domain/delivery.entity';
import { DELIVERY_REPOSITORY, DeliveryRepository } from '../domain/delivery.repository.port';

export interface GetDeliveryQuery {
  id: string;
}

@Injectable()
export class GetDeliveryUseCase {
  constructor(
    @Inject(DELIVERY_REPOSITORY) private readonly deliveryRepository: DeliveryRepository,
  ) {}

  execute(query: GetDeliveryQuery): ResultAsync<Delivery, DomainError> {
    return this.deliveryRepository
      .findById(query.id)
      .andThen((delivery) =>
        delivery ? okAsync(delivery) : errAsync(new NotFoundError('Delivery', query.id)),
      );
  }
}
