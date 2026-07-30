import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/render-with-store';
import { buildProduct } from '@/test/build-product';
import { CheckoutModal } from './CheckoutModal';

const navigateMock = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigateMock,
}));

jest.mock('@/lib/payments-gateway', () => ({
  ...jest.requireActual('@/lib/payments-gateway'),
  tokenizeCard: jest.fn(),
}));

jest.mock('@/lib/http', () => ({
  ...jest.requireActual('@/lib/http'),
  getJson: jest.fn(),
}));

const { tokenizeCard } = jest.requireMock('@/lib/payments-gateway') as { tokenizeCard: jest.Mock };
const { getJson } = jest.requireMock('@/lib/http') as { getJson: jest.Mock };

const cartWithItem = {
  cart: { items: [{ productId: 'product-1', quantity: 1 }] },
};

const inProgressCheckout = {
  checkout: {
    step: 'details' as const,
    customer: null,
    delivery: null,
    transactionId: null,
  },
  ...cartWithItem,
};

describe('CheckoutModal', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    tokenizeCard.mockReset();
    getJson.mockReset();
  });

  it('redirects home and renders nothing when there is no checkout in progress', () => {
    renderWithStore(<CheckoutModal />, undefined, '/checkout/details');

    expect(screen.queryByTestId('checkout-modal')).not.toBeInTheDocument();
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('renders the card & delivery form for the details step', () => {
    renderWithStore(<CheckoutModal />, inProgressCheckout, '/checkout/details');

    expect(screen.getByTestId('checkout-modal')).toBeInTheDocument();
    expect(screen.getByTestId('checkout-details-form')).toBeInTheDocument();
  });

  it('renders full-page, without a dimmed backdrop, when there is no background location', () => {
    renderWithStore(<CheckoutModal />, inProgressCheckout, '/checkout/details');

    expect(screen.queryByTestId('checkout-backdrop')).not.toBeInTheDocument();
  });

  it('renders as a dimmed overlay when opened with a background location', () => {
    renderWithStore(<CheckoutModal />, inProgressCheckout, {
      pathname: '/checkout/details',
      state: { background: { pathname: '/' } },
    });

    expect(screen.getByTestId('checkout-backdrop')).toBeInTheDocument();
  });

  it('recovers from a reload mid-summary by returning to the details step, since the card token is never persisted', () => {
    renderWithStore(
      <CheckoutModal />,
      { ...inProgressCheckout, checkout: { ...inProgressCheckout.checkout, step: 'summary' } },
      '/checkout/summary',
    );

    expect(screen.queryByTestId('checkout-summary')).not.toBeInTheDocument();
    expect(navigateMock).toHaveBeenCalledWith('/checkout/details', { replace: true });
  });

  it('redirects home if the status step is somehow reached without a transaction id', () => {
    renderWithStore(
      <CheckoutModal />,
      {
        ...inProgressCheckout,
        checkout: { ...inProgressCheckout.checkout, step: 'status', transactionId: null },
      },
      '/checkout/status',
    );

    expect(screen.queryByTestId('checkout-status')).not.toBeInTheDocument();
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('renders the status screen when a transaction id is present', () => {
    getJson.mockReturnValue(new Promise(() => {}));
    renderWithStore(
      <CheckoutModal />,
      {
        ...inProgressCheckout,
        checkout: { ...inProgressCheckout.checkout, step: 'status', transactionId: 'tx-1' },
      },
      '/checkout/status',
    );

    expect(screen.getByTestId('checkout-status')).toBeInTheDocument();
  });

  it('transitions from details to the summary step once the card is tokenized', async () => {
    tokenizeCard.mockResolvedValueOnce('tok_test_1');
    const user = userEvent.setup();
    const { store } = renderWithStore(
      <CheckoutModal />,
      {
        ...inProgressCheckout,
        products: { items: [buildProduct({ id: 'product-1' })], status: 'succeeded', error: null },
      },
      '/checkout/details',
    );

    await user.type(screen.getByLabelText(/^Email$/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^Full name$/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/^Phone$/i), '+573001234567');
    await user.type(screen.getByLabelText(/^Address$/i), 'Calle 123 #45-67');
    await user.type(screen.getByLabelText(/^City$/i), 'Bogotá');
    await user.type(screen.getByLabelText(/^Region$/i), 'Cundinamarca');
    await user.clear(screen.getByLabelText(/^Country$/i));
    await user.type(screen.getByLabelText(/^Country$/i), 'CO');
    await user.type(screen.getByLabelText(/Card number/i), '4242424242424242');
    await user.type(screen.getByLabelText(/^Card holder$/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/Expiry/i), '1229');
    await user.type(screen.getByLabelText(/^CVC$/i), '123');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByTestId('checkout-summary')).toBeInTheDocument();
    expect(store.getState().checkout.step).toBe('summary');
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/checkout/summary', undefined));
  });

  it('closes and navigates home when the close button is clicked', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<CheckoutModal />, inProgressCheckout, '/checkout/details');

    await user.click(screen.getByRole('button', { name: /close checkout/i }));

    expect(navigateMock).toHaveBeenCalledWith('/');
    expect(store.getState().checkout.step).toBe('product');
  });

  it('closes when the backdrop itself is clicked, but not when the modal content is clicked', async () => {
    const user = userEvent.setup();
    renderWithStore(<CheckoutModal />, inProgressCheckout, {
      pathname: '/checkout/details',
      state: { background: { pathname: '/' } },
    });

    await user.click(screen.getByTestId('checkout-details-form'));
    expect(navigateMock).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('checkout-backdrop'));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('closes when the Escape key is pressed', async () => {
    const user = userEvent.setup();
    renderWithStore(<CheckoutModal />, inProgressCheckout, '/checkout/details');

    await user.keyboard('{Escape}');

    expect(navigateMock).toHaveBeenCalledWith('/');
  });
});
