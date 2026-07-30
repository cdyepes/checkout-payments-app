import { addItem, cartReducer, clearCart, removeItem, setItemQuantity } from './cart.slice';

describe('cartReducer', () => {
  const initialState = cartReducer(undefined, { type: '@@INIT' });

  it('starts empty', () => {
    expect(initialState).toEqual({ items: [] });
  });

  it('addItem appends a new product', () => {
    const state = cartReducer(initialState, addItem({ productId: 'product-1', quantity: 2 }));

    expect(state.items).toEqual([{ productId: 'product-1', quantity: 2 }]);
  });

  it('addItem merges quantities when the product is already in the cart', () => {
    let state = cartReducer(initialState, addItem({ productId: 'product-1', quantity: 2 }));
    state = cartReducer(state, addItem({ productId: 'product-1', quantity: 3 }));

    expect(state.items).toEqual([{ productId: 'product-1', quantity: 5 }]);
  });

  it('addItem keeps distinct products as separate lines', () => {
    let state = cartReducer(initialState, addItem({ productId: 'product-1', quantity: 1 }));
    state = cartReducer(state, addItem({ productId: 'product-2', quantity: 2 }));

    expect(state.items).toEqual([
      { productId: 'product-1', quantity: 1 },
      { productId: 'product-2', quantity: 2 },
    ]);
  });

  it('setItemQuantity overwrites the quantity of an existing line', () => {
    let state = cartReducer(initialState, addItem({ productId: 'product-1', quantity: 2 }));
    state = cartReducer(state, setItemQuantity({ productId: 'product-1', quantity: 5 }));

    expect(state.items).toEqual([{ productId: 'product-1', quantity: 5 }]);
  });

  it('setItemQuantity is a no-op for a product not in the cart', () => {
    const state = cartReducer(initialState, setItemQuantity({ productId: 'missing', quantity: 5 }));

    expect(state.items).toEqual([]);
  });

  it('removeItem drops only the matching line', () => {
    let state = cartReducer(initialState, addItem({ productId: 'product-1', quantity: 1 }));
    state = cartReducer(state, addItem({ productId: 'product-2', quantity: 1 }));
    state = cartReducer(state, removeItem({ productId: 'product-1' }));

    expect(state.items).toEqual([{ productId: 'product-2', quantity: 1 }]);
  });

  it('clearCart empties the cart', () => {
    let state = cartReducer(initialState, addItem({ productId: 'product-1', quantity: 1 }));
    state = cartReducer(state, clearCart());

    expect(state).toEqual({ items: [] });
  });
});
