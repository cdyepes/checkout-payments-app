import { combineReducers } from '@reduxjs/toolkit';
import { productsReducer } from '@/features/products/products.slice';
import { checkoutReducer } from '@/features/checkout/checkout.slice';
import { cartReducer } from '@/features/cart/cart.slice';

export const rootReducer = combineReducers({
  products: productsReducer,
  checkout: checkoutReducer,
  cart: cartReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
