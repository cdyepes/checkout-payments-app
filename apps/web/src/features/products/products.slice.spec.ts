import { configureStore } from '@reduxjs/toolkit';
import { buildProduct } from '@/test/build-product';
import { fetchProducts, productsReducer } from './products.slice';

function buildStore() {
  return configureStore({ reducer: { products: productsReducer } });
}

describe('productsSlice', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts idle with no items', () => {
    const store = buildStore();
    expect(store.getState().products).toEqual({ items: [], status: 'idle', error: null });
  });

  it('transitions to succeeded with the fetched products', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [buildProduct()],
    } as Response);
    const store = buildStore();

    await store.dispatch(fetchProducts());

    expect(store.getState().products.status).toBe('succeeded');
    expect(store.getState().products.items).toHaveLength(1);
  });

  it('transitions to failed when the request errors', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ message: 'boom' }),
    } as Response);
    const store = buildStore();

    await store.dispatch(fetchProducts());

    expect(store.getState().products.status).toBe('failed');
    expect(store.getState().products.error).toBe('boom');
  });

  it('falls back to a generic error message when the rejection carries none', () => {
    const state = productsReducer(undefined, {
      type: fetchProducts.rejected.type,
      error: {},
    });

    expect(state.status).toBe('failed');
    expect(state.error).toBe('Failed to load products');
  });
});
