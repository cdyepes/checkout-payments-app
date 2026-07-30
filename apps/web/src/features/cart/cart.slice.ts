import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  productId: string;
  quantity: number;
}

// Deliberately holds only productId/quantity — never a price or product name — so
// the cart always reflects the live catalogue (via the products slice) rather than
// a stale snapshot, and the server stays the sole source of truth for pricing.
export interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find((item) => item.productId === action.payload.productId);
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
    },
    setItemQuantity: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find((item) => item.productId === action.payload.productId);
      if (existing) {
        existing.quantity = action.payload.quantity;
      }
    },
    removeItem: (state, action: PayloadAction<{ productId: string }>) => {
      state.items = state.items.filter((item) => item.productId !== action.payload.productId);
    },
    clearCart: () => initialState,
  },
});

export const { addItem, setItemQuantity, removeItem, clearCart } = cartSlice.actions;
export const cartReducer = cartSlice.reducer;
