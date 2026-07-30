import { createSelector } from '@reduxjs/toolkit';
import type { ProductResponse } from '@checkout/contracts';
import type { RootState } from '@/app/root-reducer';
import type { CartItem } from './cart.slice';

export interface CartLine extends CartItem {
  product: ProductResponse;
  subtotalInCents: number;
}

export function selectCartItems(state: RootState): CartItem[] {
  return state.cart.items;
}

export function selectCartItemCount(state: RootState): number {
  return state.cart.items.reduce((count, item) => count + item.quantity, 0);
}

// Memoized: without it, this selector's `.flatMap` return would be a fresh array
// reference on every call, and useSelector would treat every store update as a
// change worth re-rendering for, no matter how unrelated to the cart.
// Joins cart items with the live product catalogue for display — a productId whose
// product hasn't loaded yet (or no longer exists) is simply omitted, rather than
// rendered with stale or missing data.
export const selectCartLines = createSelector(
  [(state: RootState) => state.cart.items, (state: RootState) => state.products.items],
  (cartItems, products): CartLine[] => {
    const productsById = new Map(products.map((product) => [product.id, product]));

    return cartItems.flatMap((item) => {
      const product = productsById.get(item.productId);
      if (!product) return [];
      return [{ ...item, product, subtotalInCents: product.priceInCents * item.quantity }];
    });
  },
);

export const selectCartSubtotalInCents = createSelector([selectCartLines], (lines) =>
  lines.reduce((sum, line) => sum + line.subtotalInCents, 0),
);
