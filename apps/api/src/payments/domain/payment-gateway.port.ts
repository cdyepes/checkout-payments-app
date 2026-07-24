import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../shared/domain/domain-error';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export type GatewayTransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';

export interface CreateGatewayTransactionCommand {
  reference: string;
  amountInCents: number;
  currency: string;
  cardToken: string;
  customerEmail: string;
}

export interface GatewayTransaction {
  id: string;
  status: GatewayTransactionStatus;
}

// The gateway never receives a raw card number: the frontend tokenizes the card
// directly with the provider using the public key, and only the token reaches us.
export interface PaymentGateway {
  createTransaction(
    command: CreateGatewayTransactionCommand,
  ): ResultAsync<GatewayTransaction, DomainError>;
  getTransactionStatus(gatewayTransactionId: string): ResultAsync<GatewayTransaction, DomainError>;
}
