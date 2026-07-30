import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/render-with-store';
import { buildProduct } from '@/test/build-product';
import { CartPanel } from './CartPanel';

const navigateMock = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigateMock,
}));

jest.mock('@/lib/http', () => ({
  ...jest.requireActual('@/lib/http'),
  getJson: jest.fn(),
}));

const { getJson } = jest.requireMock('@/lib/http') as { getJson: jest.Mock };

const keyboard = buildProduct({ id: 'product-1', name: 'Keyboard', priceInCents: 100_000, stock: 5 });
const headphones = buildProduct({
  id: 'product-2',
  name: 'Headphones',
  priceInCents: 50_000,
  stock: 3,
});

function preloadedState(items: { productId: string; quantity: number }[] = []) {
  return {
    products: { items: [keyboard, headphones], status: 'succeeded' as const, error: null },
    cart: { items },
  };
}

describe('CartPanel', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    getJson.mockReset();
  });

  it('fetches the product catalogue on a direct load, so a persisted cart with an idle catalogue still renders its lines', async () => {
    getJson.mockResolvedValueOnce([keyboard, headphones]);

    renderWithStore(
      <CartPanel />,
      {
        products: { items: [], status: 'idle', error: null },
        cart: { items: [{ productId: 'product-1', quantity: 1 }] },
      },
      '/cart',
    );

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Keyboard')).toBeInTheDocument());
    expect(screen.queryByText(/your cart is empty/i)).not.toBeInTheDocument();
  });

  it('shows an empty-cart message when there are no items', () => {
    renderWithStore(<CartPanel />, preloadedState([]), '/cart');

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.queryByTestId('cart-lines')).not.toBeInTheDocument();
  });

  it('renders one line per cart item with its subtotal', () => {
    renderWithStore(
      <CartPanel />,
      preloadedState([
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 },
      ]),
      '/cart',
    );

    expect(screen.getByText('Keyboard')).toBeInTheDocument();
    expect(screen.getByText('Headphones')).toBeInTheDocument();
    expect(screen.getByText('$ 2.000')).toBeInTheDocument(); // 100_000 * 2 / 100
    expect(screen.getByText('$ 500')).toBeInTheDocument(); // 50_000 * 1 / 100
  });

  it('increases and decreases a line quantity via its stepper', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(
      <CartPanel />,
      preloadedState([{ productId: 'product-1', quantity: 2 }]),
      '/cart',
    );

    await user.click(screen.getByRole('button', { name: /increase quantity of keyboard/i }));
    expect(store.getState().cart.items).toEqual([{ productId: 'product-1', quantity: 3 }]);

    await user.click(screen.getByRole('button', { name: /decrease quantity of keyboard/i }));
    await user.click(screen.getByRole('button', { name: /decrease quantity of keyboard/i }));
    expect(store.getState().cart.items).toEqual([{ productId: 'product-1', quantity: 1 }]);
  });

  it('does not let the stepper exceed the product stock or drop below 1', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(
      <CartPanel />,
      preloadedState([{ productId: 'product-1', quantity: 5 }]),
      '/cart',
    );

    await user.click(screen.getByRole('button', { name: /increase quantity of keyboard/i }));
    expect(store.getState().cart.items).toEqual([{ productId: 'product-1', quantity: 5 }]);
  });

  it('removes a line from the cart', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(
      <CartPanel />,
      preloadedState([
        { productId: 'product-1', quantity: 1 },
        { productId: 'product-2', quantity: 1 },
      ]),
      '/cart',
    );

    await user.click(screen.getByRole('button', { name: /remove keyboard from cart/i }));

    expect(store.getState().cart.items).toEqual([{ productId: 'product-2', quantity: 1 }]);
  });

  it('begins checkout and navigates to the details step when continuing', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(
      <CartPanel />,
      preloadedState([{ productId: 'product-1', quantity: 1 }]),
      '/cart',
    );

    await user.click(screen.getByRole('button', { name: /continue to checkout/i }));

    expect(store.getState().checkout.step).toBe('details');
    expect(navigateMock).toHaveBeenCalledWith('/checkout/details', undefined);
  });

  it('renders full-page, without a dimmed backdrop, when there is no background location', () => {
    renderWithStore(<CartPanel />, preloadedState([]), '/cart');

    expect(screen.queryByTestId('cart-backdrop')).not.toBeInTheDocument();
  });

  it('renders as a dimmed overlay when opened with a background location', () => {
    renderWithStore(<CartPanel />, preloadedState([]), {
      pathname: '/cart',
      state: { background: { pathname: '/' } },
    });

    expect(screen.getByTestId('cart-backdrop')).toBeInTheDocument();
  });

  it('closes when the backdrop itself is clicked, but not when the panel content is clicked', async () => {
    const user = userEvent.setup();
    renderWithStore(<CartPanel />, preloadedState([]), {
      pathname: '/cart',
      state: { background: { pathname: '/' } },
    });

    await user.click(screen.getByTestId('cart-panel'));
    expect(navigateMock).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('cart-backdrop'));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('closes and navigates home when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithStore(<CartPanel />, preloadedState([]), '/cart');

    await user.click(screen.getByRole('button', { name: /close cart/i }));

    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('closes when the Escape key is pressed', async () => {
    const user = userEvent.setup();
    renderWithStore(<CartPanel />, preloadedState([]), '/cart');

    await user.keyboard('{Escape}');

    expect(navigateMock).toHaveBeenCalledWith('/');
  });
});
