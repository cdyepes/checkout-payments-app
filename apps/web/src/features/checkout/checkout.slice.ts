import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CustomerInput, DeliveryInput } from '@checkout/contracts';

export type CheckoutStep = 'product' | 'details' | 'summary' | 'status';

// Card number, expiry and CVV are intentionally absent from this state — they
// live only in local component state for the moment it takes to tokenize them
// with the payment provider, and are never persisted.
export interface CheckoutState {
  step: CheckoutStep;
  customer: CustomerInput | null;
  delivery: DeliveryInput | null;
  transactionId: string | null;
}

const initialState: CheckoutState = {
  step: 'product',
  customer: null,
  delivery: null,
  transactionId: null,
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    beginCheckout: (state) => {
      state.step = 'details';
    },
    setStep: (state, action: PayloadAction<CheckoutStep>) => {
      state.step = action.payload;
    },
    setCustomerAndDelivery: (
      state,
      action: PayloadAction<{ customer: CustomerInput; delivery: DeliveryInput }>,
    ) => {
      state.customer = action.payload.customer;
      state.delivery = action.payload.delivery;
    },
    setTransactionId: (state, action: PayloadAction<string>) => {
      state.transactionId = action.payload;
    },
    resetCheckout: () => initialState,
  },
});

export const { beginCheckout, setStep, setCustomerAndDelivery, setTransactionId, resetCheckout } =
  checkoutSlice.actions;
export const checkoutReducer = checkoutSlice.reducer;
