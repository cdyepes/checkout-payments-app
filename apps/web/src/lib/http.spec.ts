import { z } from 'zod';
import { getJson, HttpError, postJson } from './http';

describe('getJson', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses a successful response against the given schema', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    const result = await getJson('/health', z.object({ ok: z.boolean() }));

    expect(result).toEqual({ ok: true });
  });

  it('throws HttpError with the status and message on a failed response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Product not found' }),
    } as Response);

    await expect(getJson('/products/missing', z.unknown())).rejects.toMatchObject({
      status: 404,
      message: 'Product not found',
    });
  });

  it('falls back to a generic message when the error body has no message field', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({}),
    } as unknown as Response);

    await expect(getJson('/boom', z.unknown())).rejects.toMatchObject({
      status: 400,
      message: 'Request failed',
    });
  });

  it('falls back to statusText when the error body has no message', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);

    await expect(getJson('/boom', z.unknown())).rejects.toBeInstanceOf(HttpError);
  });

  it('throws a validation error when the response does not match the schema', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ unexpected: true }),
    } as Response);

    await expect(getJson('/health', z.object({ ok: z.boolean() }))).rejects.toThrow();
  });
});

describe('postJson', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts the JSON body and parses a successful response against the given schema', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1' }),
    } as Response);

    const result = await postJson('/transactions', { productId: 'p1' }, z.object({ id: z.string() }));

    expect(result).toEqual({ id: '1' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/transactions'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'p1' }),
      }),
    );
  });

  it('throws HttpError with the status and message on a failed response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ message: 'Not enough stock available' }),
    } as Response);

    await expect(postJson('/transactions', {}, z.unknown())).rejects.toMatchObject({
      status: 409,
      message: 'Not enough stock available',
    });
  });
});
