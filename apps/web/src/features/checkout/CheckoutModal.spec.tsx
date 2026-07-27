import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/render-with-store';
import { CheckoutModal } from './CheckoutModal';

const navigateMock = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigateMock,
}));

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

describe('CheckoutModal', () => {
  beforeEach(() => {
    navigateMock.mockClear();
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

  it('renders the summary placeholder for the summary step', () => {
    renderWithStore(
      <CheckoutModal />,
      { checkout: { ...inProgressCheckout.checkout, step: 'summary' } },
      '/checkout/summary',
    );

    expect(screen.getByText('Payment summary')).toBeInTheDocument();
  });

  it('closes and navigates home when the close button is clicked', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<CheckoutModal />, inProgressCheckout, '/checkout/details');

    await user.click(screen.getByRole('button', { name: /close checkout/i }));

    expect(navigateMock).toHaveBeenCalledWith('/');
    expect(store.getState().checkout.productId).toBeNull();
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
