import {
  beginCheckout,
  checkoutReducer,
  resetCheckout,
  setCustomerAndDelivery,
  setStep,
} from './checkout.slice';

describe('checkoutReducer', () => {
  const initialState = checkoutReducer(undefined, { type: '@@INIT' });

  it('starts in the product step with no selection', () => {
    expect(initialState).toEqual({
      step: 'product',
      customer: null,
      delivery: null,
      transactionId: null,
    });
  });

  it('beginCheckout moves to the details step', () => {
    const state = checkoutReducer(initialState, beginCheckout());

    expect(state.step).toBe('details');
  });

  it('setStep updates only the step', () => {
    const state = checkoutReducer(initialState, setStep('summary'));
    expect(state.step).toBe('summary');
  });

  it('resetCheckout returns to the initial state', () => {
    const started = checkoutReducer(initialState, beginCheckout());
    const reset = checkoutReducer(started, resetCheckout());

    expect(reset).toEqual(initialState);
  });

  it('setCustomerAndDelivery records both without touching the rest of the state', () => {
    const started = checkoutReducer(initialState, beginCheckout());
    const customer = { email: 'jane@example.com', fullName: 'Jane Doe', phone: '+573001234567' };
    const delivery = { addressLine: 'Calle 123', city: 'Bogotá', region: 'Cundinamarca', country: 'CO' };

    const state = checkoutReducer(started, setCustomerAndDelivery({ customer, delivery }));

    expect(state.customer).toEqual(customer);
    expect(state.delivery).toEqual(delivery);
    expect(state.step).toBe('details');
  });

  it('never stores card fields in its shape', () => {
    const state = checkoutReducer(initialState, beginCheckout());

    expect(state).not.toHaveProperty('cardNumber');
    expect(state).not.toHaveProperty('cvv');
    expect(state).not.toHaveProperty('cardToken');
  });
});
