import { z } from 'zod';
import { getJson, HttpError } from './http';

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
