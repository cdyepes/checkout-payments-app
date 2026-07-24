import { combineReducers } from '@reduxjs/toolkit';
import { productsReducer } from '@/features/products/products.slice';
import { checkoutReducer } from '@/features/checkout/checkout.slice';

export const rootReducer = combineReducers({
  products: productsReducer,
  checkout: checkoutReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
