import { screen } from '@testing-library/react';
import { renderWithStore } from '@/test/render-with-store';
import { AppRoutes } from './AppRoutes';

const preloadedProductsState = {
  products: { items: [], status: 'succeeded' as const, error: null },
};

const inProgressCheckout = {
  checkout: {
    step: 'details' as const,
    customer: null,
    delivery: null,
    transactionId: null,
  },
  cart: { items: [{ productId: 'product-1', quantity: 1 }] },
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

  it('recovers to the details form when /checkout/summary is reached without a card token (e.g. a reload)', () => {
    renderWithStore(
      <AppRoutes />,
      {
        ...preloadedProductsState,
        checkout: { ...inProgressCheckout.checkout, step: 'summary' },
        cart: inProgressCheckout.cart,
      },
      '/checkout/summary',
    );
    expect(screen.getByTestId('checkout-details-form')).toBeInTheDocument();
  });

  it('renders the status screen at /checkout/status when a transaction id is present', () => {
    renderWithStore(
      <AppRoutes />,
      {
        ...preloadedProductsState,
        checkout: { ...inProgressCheckout.checkout, step: 'status', transactionId: 'tx-1' },
        cart: inProgressCheckout.cart,
      },
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

  it('renders the cart panel at /cart', () => {
    renderWithStore(
      <AppRoutes />,
      { ...preloadedProductsState, cart: { items: [] } },
      '/cart',
    );
    expect(screen.getByTestId('cart-panel')).toBeInTheDocument();
  });

  it('keeps the product page rendered underneath the cart panel as a background-location overlay', () => {
    renderWithStore(
      <AppRoutes />,
      { ...preloadedProductsState, cart: { items: [] } },
      { pathname: '/cart', state: { background: { pathname: '/' } } },
    );

    expect(screen.getByText('Store')).toBeInTheDocument();
    expect(screen.getByTestId('cart-panel')).toBeInTheDocument();
  });
});
