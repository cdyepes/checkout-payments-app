import { checkoutReducer, resetCheckout, setStep, startCheckout } from './checkout.slice';

describe('checkoutReducer', () => {
  const initialState = checkoutReducer(undefined, { type: '@@INIT' });

  it('starts in the product step with no selection', () => {
    expect(initialState).toEqual({
      step: 'product',
      productId: null,
      quantity: 1,
      customer: null,
      delivery: null,
      transactionId: null,
    });
  });

  it('startCheckout moves to the details step and records the selection', () => {
    const state = checkoutReducer(
      initialState,
      startCheckout({ productId: 'product-1', quantity: 2 }),
    );

    expect(state.step).toBe('details');
    expect(state.productId).toBe('product-1');
    expect(state.quantity).toBe(2);
  });

  it('setStep updates only the step', () => {
    const state = checkoutReducer(initialState, setStep('summary'));
    expect(state.step).toBe('summary');
  });

  it('resetCheckout returns to the initial state', () => {
    const started = checkoutReducer(
      initialState,
      startCheckout({ productId: 'product-1', quantity: 2 }),
    );
    const reset = checkoutReducer(started, resetCheckout());

    expect(reset).toEqual(initialState);
  });

  it('never stores card fields in its shape', () => {
    const state = checkoutReducer(
      initialState,
      startCheckout({ productId: 'product-1', quantity: 1 }),
    );

    expect(state).not.toHaveProperty('cardNumber');
    expect(state).not.toHaveProperty('cvv');
    expect(state).not.toHaveProperty('cardToken');
  });
});
