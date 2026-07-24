import { screen } from '@testing-library/react';
import { renderWithStore } from '@/test/render-with-store';
import { AppRoutes } from './AppRoutes';

const preloadedProductsState = {
  products: { items: [], status: 'succeeded' as const, error: null },
};

describe('AppRoutes', () => {
  it('renders the product page at /', () => {
    renderWithStore(<AppRoutes />, preloadedProductsState, '/');
    expect(screen.getByText('Store')).toBeInTheDocument();
  });

  it('renders the details placeholder at /checkout/details', () => {
    renderWithStore(<AppRoutes />, preloadedProductsState, '/checkout/details');
    expect(screen.getByText('Card & delivery details')).toBeInTheDocument();
  });

  it('renders the summary placeholder at /checkout/summary', () => {
    renderWithStore(<AppRoutes />, preloadedProductsState, '/checkout/summary');
    expect(screen.getByText('Payment summary')).toBeInTheDocument();
  });

  it('renders the status placeholder at /checkout/status', () => {
    renderWithStore(<AppRoutes />, preloadedProductsState, '/checkout/status');
    expect(screen.getByText('Payment status')).toBeInTheDocument();
  });
});
