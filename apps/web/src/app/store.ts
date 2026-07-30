import { configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  createMigrate,
  persistReducer,
  persistStore,
  type PersistedState,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { rootReducer } from './root-reducer';

// Only checkout and cart survive a refresh — products are re-fetched, and checkout
// never holds card data in the first place (see checkout.slice.ts).
export const migrations = {
  // Iteration 9 replaced checkout's single-product `productId`/`quantity` fields
  // with a separate cart. A persisted pre-cart checkout blob has no meaningful
  // translation into the new shape (it may be mid-checkout for a product whose
  // quantity now lives nowhere), so this migration drops it and lets the checkout
  // reducer fall back to its own initialState — safer than carrying stale fields
  // forward. Unversioned state (from before persistence had a version at all)
  // carries `_persist.version === -1`, so this migration runs for every existing
  // visitor exactly once.
  1: (state: PersistedState) => {
    if (!state) return state;
    const { checkout: _checkout, ...rest } = state as Record<string, unknown>;
    return rest as PersistedState;
  },
};

const persistConfig = {
  key: 'checkout-app',
  version: 1,
  storage,
  whitelist: ['checkout', 'cart'],
  migrate: createMigrate(migrations),
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE],
      },
    }),
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
