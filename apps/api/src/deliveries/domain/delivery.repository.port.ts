import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../shared/domain/domain-error';
import { Delivery, DeliveryProps } from './delivery.entity';

export const DELIVERY_REPOSITORY = Symbol('DELIVERY_REPOSITORY');

export interface DeliveryRepository {
  findById(id: string): ResultAsync<Delivery | null, DomainError>;
  findByTransactionId(transactionId: string): ResultAsync<Delivery | null, DomainError>;
  create(props: Omit<DeliveryProps, 'id'>): ResultAsync<Delivery, DomainError>;
  markAssigned(id: string): ResultAsync<Delivery, DomainError>;
}
