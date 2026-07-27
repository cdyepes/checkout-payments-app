import { screen } from '@testing-library/react';
import { renderWithStore } from '@/test/render-with-store';
import { AppRoutes } from './AppRoutes';

const preloadedProductsState = {
  products: { items: [], status: 'succeeded' as const, error: null },
};

const inProgressCheckout = {
  checkout: {
    step: 'details' as const,
    productId: 'product-1',
    quantity: 1,
    customer: null,
    delivery: null,
    transactionId: null,
  },
};

describe('AppRoutes', () => {
  it('renders the product page at /', () => {
    renderWithStore(<AppRoutes />, preloadedProductsState, '/');
    expect(screen.getByText('Store')).toBeInTheDocument();
  });

  it('renders the card & delivery form at /checkout/details when a checkout is in progress', () => {
    renderWithStore(
      <AppRoutes />,
      { ...preloadedProductsState, ...inProgressCheckout },
      '/checkout/details',
    );
    expect(screen.getByTestId('checkout-details-form')).toBeInTheDocument();
  });

  it('renders the summary placeholder at /checkout/summary', () => {
    renderWithStore(
      <AppRoutes />,
      { ...preloadedProductsState, checkout: { ...inProgressCheckout.checkout, step: 'summary' } },
      '/checkout/summary',
    );
    expect(screen.getByText('Payment summary')).toBeInTheDocument();
  });

  it('renders the status placeholder at /checkout/status', () => {
    renderWithStore(
      <AppRoutes />,
      { ...preloadedProductsState, checkout: { ...inProgressCheckout.checkout, step: 'status' } },
      '/checkout/status',
    );
    expect(screen.getByText('Payment status')).toBeInTheDocument();
  });

  it('renders full-page (no product page underneath) when /checkout/details is deep-linked directly', () => {
    renderWithStore(
      <AppRoutes />,
      { ...preloadedProductsState, ...inProgressCheckout },
      '/checkout/details',
    );
    expect(screen.queryByText('Store')).not.toBeInTheDocument();
  });

  it('keeps the product page rendered underneath the modal as a background-location overlay', () => {
    renderWithStore(<AppRoutes />, { ...preloadedProductsState, ...inProgressCheckout }, {
      pathname: '/checkout/details',
      state: { background: { pathname: '/' } },
    });

    expect(screen.getByText('Store')).toBeInTheDocument();
    expect(screen.getByTestId('checkout-details-form')).toBeInTheDocument();
  });
});
