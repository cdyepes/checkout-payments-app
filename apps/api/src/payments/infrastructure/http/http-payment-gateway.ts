import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResultAsync } from 'neverthrow';
import { DomainError, GatewayError } from '../../../shared/domain/domain-error';
import { Env } from '../../../shared/config/env.schema';
import {
  CreateGatewayTransactionCommand,
  GatewayTransaction,
  GatewayTransactionStatus,
  PaymentGateway,
} from '../../domain/payment-gateway.port';

interface ProviderMerchantResponse {
  data: {
    presigned_acceptance: { acceptance_token: string };
    presigned_personal_data_auth?: { acceptance_token: string };
  };
}

interface ProviderTransactionResponse {
  data: { id: string; status: GatewayTransactionStatus };
}

@Injectable()
export class HttpPaymentGateway implements PaymentGateway {
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly integrityKey: string;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get('PAYMENTS_API_URL', { infer: true });
    this.publicKey = config.get('PAYMENTS_PUBLIC_KEY', { infer: true });
    this.privateKey = config.get('PAYMENTS_PRIVATE_KEY', { infer: true });
    this.integrityKey = config.get('PAYMENTS_INTEGRITY_KEY', { infer: true });
  }

  createTransaction(
    command: CreateGatewayTransactionCommand,
  ): ResultAsync<GatewayTransaction, DomainError> {
    return this.fetchAcceptanceTokens().andThen((tokens) =>
      this.submitTransaction(command, tokens),
    );
  }

  getTransactionStatus(gatewayTransactionId: string): ResultAsync<GatewayTransaction, DomainError> {
    return ResultAsync.fromPromise(
      fetch(`${this.baseUrl}/transactions/${gatewayTransactionId}`, {
        headers: { Authorization: `Bearer ${this.publicKey}` },
      }).then((response) => this.parseJson<ProviderTransactionResponse>(response)),
      (error) => this.toGatewayError('Failed to fetch transaction status', error),
    ).map((body) => ({ id: body.data.id, status: body.data.status }));
  }

  private fetchAcceptanceTokens(): ResultAsync<
    { acceptanceToken: string; personalDataAuthToken: string | undefined },
    DomainError
  > {
    return ResultAsync.fromPromise(
      fetch(`${this.baseUrl}/merchants/${this.publicKey}`).then((response) =>
        this.parseJson<ProviderMerchantResponse>(response),
      ),
      (error) => this.toGatewayError('Failed to fetch acceptance token', error),
    ).map((body) => ({
      acceptanceToken: body.data.presigned_acceptance.acceptance_token,
      personalDataAuthToken: body.data.presigned_personal_data_auth?.acceptance_token,
    }));
  }

  private submitTransaction(
    command: CreateGatewayTransactionCommand,
    tokens: { acceptanceToken: string; personalDataAuthToken: string | undefined },
  ): ResultAsync<GatewayTransaction, DomainError> {
    const signature = this.computeSignature(command);

    return ResultAsync.fromPromise(
      fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.privateKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acceptance_token: tokens.acceptanceToken,
          ...(tokens.personalDataAuthToken
            ? { accept_personal_auth: tokens.personalDataAuthToken }
            : {}),
          amount_in_cents: command.amountInCents,
          currency: command.currency,
          customer_email: command.customerEmail,
          reference: command.reference,
          signature,
          payment_method: { type: 'CARD', token: command.cardToken, installments: 1 },
        }),
      }).then((response) => this.parseJson<ProviderTransactionResponse>(response)),
      (error) => this.toGatewayError('Failed to create gateway transaction', error),
    ).map((body) => ({ id: body.data.id, status: body.data.status }));
  }

  private computeSignature(command: CreateGatewayTransactionCommand): string {
    const raw = `${command.reference}${command.amountInCents}${command.currency}${this.integrityKey}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  private async parseJson<T>(response: Response): Promise<T> {
    const body = (await response.json()) as T;
    if (!response.ok) {
      throw new Error(`Gateway responded with status ${response.status}: ${JSON.stringify(body)}`);
    }
    return body;
  }

  private toGatewayError(message: string, error: unknown): DomainError {
    return new GatewayError(`${message}: ${(error as Error).message}`);
  }
}
