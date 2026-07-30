import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { GatewayError } from '../../../shared/domain/domain-error';
import { Env } from '../../../shared/config/env.schema';
import { HttpPaymentGateway } from './http-payment-gateway';

function buildConfig(overrides: Partial<Env> = {}): ConfigService<Env, true> {
  const values: Partial<Env> = {
    PAYMENTS_API_URL: 'https://sandbox.payment-provider.example/v1',
    PAYMENTS_PUBLIC_KEY: 'pub_test_key',
    PAYMENTS_PRIVATE_KEY: 'prv_test_key',
    PAYMENTS_INTEGRITY_KEY: 'test_integrity_key',
    ...overrides,
  };
  return { get: (key: keyof Env) => values[key] } as unknown as ConfigService<Env, true>;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('HttpPaymentGateway', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createTransaction', () => {
    const command = {
      reference: 'ref-1',
      amountInCents: 1_400_000,
      currency: 'COP',
      cardToken: 'tok_test_card',
      customerEmail: 'jane@example.com',
    };

    it('fetches acceptance tokens, signs the request, and returns the gateway transaction', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          jsonResponse(200, {
            data: {
              presigned_acceptance: { acceptance_token: 'acc-token' },
              presigned_personal_data_auth: { acceptance_token: 'personal-token' },
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(201, { data: { id: 'gw-tx-1', status: 'PENDING' } }),
        );
      const gateway = new HttpPaymentGateway(buildConfig());

      const result = await gateway.createTransaction(command);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ id: 'gw-tx-1', status: 'PENDING' });

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://sandbox.payment-provider.example/v1/merchants/pub_test_key',
      );

      const [transactionsUrl, requestInit] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(transactionsUrl).toBe('https://sandbox.payment-provider.example/v1/transactions');
      expect(requestInit.method).toBe('POST');
      expect(requestInit.headers).toMatchObject({ Authorization: 'Bearer prv_test_key' });

      const expectedSignature = createHash('sha256')
        .update('ref-1' + '1400000' + 'COP' + 'test_integrity_key')
        .digest('hex');
      const body = JSON.parse(requestInit.body as string) as Record<string, unknown>;
      expect(body).toMatchObject({
        acceptance_token: 'acc-token',
        accept_personal_auth: 'personal-token',
        amount_in_cents: 1_400_000,
        currency: 'COP',
        customer_email: 'jane@example.com',
        reference: 'ref-1',
        signature: expectedSignature,
        payment_method: { type: 'CARD', token: 'tok_test_card', installments: 1 },
      });
    });

    it('omits accept_personal_auth when the merchant response has no personal data auth token', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          jsonResponse(200, { data: { presigned_acceptance: { acceptance_token: 'acc-token' } } }),
        )
        .mockResolvedValueOnce(
          jsonResponse(201, { data: { id: 'gw-tx-1', status: 'PENDING' } }),
        );
      const gateway = new HttpPaymentGateway(buildConfig());

      const result = await gateway.createTransaction(command);

      expect(result.isOk()).toBe(true);
      const fetchMock = global.fetch as jest.Mock;
      const [, requestInit] = fetchMock.mock.calls[1] as [string, RequestInit];
      const body = JSON.parse(requestInit.body as string) as Record<string, unknown>;
      expect(body).not.toHaveProperty('accept_personal_auth');
    });

    it('returns a GatewayError when fetching the acceptance token fails', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network down'));
      const gateway = new HttpPaymentGateway(buildConfig());

      const result = await gateway.createTransaction(command);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GatewayError);
      expect(result._unsafeUnwrapErr().message).toContain('Failed to fetch acceptance token');
    });

    it('returns a GatewayError when the transaction creation request fails', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          jsonResponse(200, { data: { presigned_acceptance: { acceptance_token: 'acc-token' } } }),
        )
        .mockResolvedValueOnce(jsonResponse(422, { error: { messages: 'invalid' } }));
      const gateway = new HttpPaymentGateway(buildConfig());

      const result = await gateway.createTransaction(command);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GatewayError);
      expect(result._unsafeUnwrapErr().message).toContain('Failed to create gateway transaction');
    });
  });

  describe('getTransactionStatus', () => {
    it('authenticates with the public key and returns the current status', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(jsonResponse(200, { data: { id: 'gw-tx-1', status: 'APPROVED' } }));
      const gateway = new HttpPaymentGateway(buildConfig());

      const result = await gateway.getTransactionStatus('gw-tx-1');

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual({ id: 'gw-tx-1', status: 'APPROVED' });
      expect(fetchMock).toHaveBeenCalledWith('https://sandbox.payment-provider.example/v1/transactions/gw-tx-1', {
        headers: { Authorization: 'Bearer pub_test_key' },
      });
    });

    it('returns a GatewayError when the status request fails', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('timeout'));
      const gateway = new HttpPaymentGateway(buildConfig());

      const result = await gateway.getTransactionStatus('gw-tx-1');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GatewayError);
    });
  });
});
