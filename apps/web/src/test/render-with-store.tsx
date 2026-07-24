import { PropsWithChildren, ReactElement } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer, type RootState } from '@/app/root-reducer';

export function renderWithStore(
  ui: ReactElement,
  preloadedState?: Partial<RootState>,
  route = '/',
) {
  const store = configureStore({ reducer: rootReducer, preloadedState });

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper }) };
}
