import { PaymentGatewayError, tokenizeCard } from './payments-gateway';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

const input = {
  number: '4242424242424242',
  cvc: '123',
  expMonth: '12',
  expYear: '29',
  cardHolder: 'Jane Doe',
};

describe('tokenizeCard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts the card details to the provider and returns the token id', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse(201, { status: 'CREATED', data: { id: 'tok_test_1' } }));

    const token = await tokenizeCard(input);

    expect(token).toBe('tok_test_1');
    const [url, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api-sandbox.example.test/v1/tokens/cards');
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers).toMatchObject({ Authorization: 'Bearer pub_test_key' });
    expect(JSON.parse(requestInit.body as string)).toEqual({
      number: '4242424242424242',
      cvc: '123',
      exp_month: '12',
      exp_year: '29',
      card_holder: 'Jane Doe',
    });
  });

  it('throws a PaymentGatewayError when the provider rejects the request', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse(422, { error: { messages: { number: ['is invalid'] } } }));

    await expect(tokenizeCard(input)).rejects.toBeInstanceOf(PaymentGatewayError);
  });

  it('throws a PaymentGatewayError when the network request fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('offline'));

    await expect(tokenizeCard(input)).rejects.toBeInstanceOf(PaymentGatewayError);
  });
});
