import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type CheckoutStep = 'product' | 'details' | 'summary' | 'status';

export interface CheckoutCustomer {
  email: string;
  fullName: string;
  phone: string;
}

export interface CheckoutDelivery {
  addressLine: string;
  city: string;
  region: string;
  country: string;
}

// Card number, expiry and CVV are intentionally absent from this state — they
// live only in local component state for the moment it takes to tokenize them
// with the payment provider, and are never persisted.
export interface CheckoutState {
  step: CheckoutStep;
  productId: string | null;
  quantity: number;
  customer: CheckoutCustomer | null;
  delivery: CheckoutDelivery | null;
  transactionId: string | null;
}

const initialState: CheckoutState = {
  step: 'product',
  productId: null,
  quantity: 1,
  customer: null,
  delivery: null,
  transactionId: null,
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    startCheckout: (state, action: PayloadAction<{ productId: string; quantity: number }>) => {
      state.step = 'details';
      state.productId = action.payload.productId;
      state.quantity = action.payload.quantity;
    },
    setStep: (state, action: PayloadAction<CheckoutStep>) => {
      state.step = action.payload;
    },
    setCustomerAndDelivery: (
      state,
      action: PayloadAction<{ customer: CheckoutCustomer; delivery: CheckoutDelivery }>,
    ) => {
      state.customer = action.payload.customer;
      state.delivery = action.payload.delivery;
    },
    resetCheckout: () => initialState,
  },
});

export const { startCheckout, setStep, setCustomerAndDelivery, resetCheckout } =
  checkoutSlice.actions;
export const checkoutReducer = checkoutSlice.reducer;
