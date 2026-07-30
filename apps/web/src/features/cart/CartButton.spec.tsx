import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/render-with-store';
import { CartButton } from './CartButton';

const navigateMock = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigateMock,
}));

describe('CartButton', () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it('hides the badge when the cart is empty', () => {
    renderWithStore(<CartButton />, { cart: { items: [] } });

    expect(screen.queryByTestId('cart-badge')).not.toBeInTheDocument();
  });

  it('shows the total item count across all lines', () => {
    renderWithStore(<CartButton />, {
      cart: {
        items: [
          { productId: 'product-1', quantity: 2 },
          { productId: 'product-2', quantity: 3 },
        ],
      },
    });

    expect(screen.getByTestId('cart-badge')).toHaveTextContent('5');
  });

  it('navigates to /cart with the current location as background', async () => {
    const user = userEvent.setup();
    renderWithStore(<CartButton />, { cart: { items: [] } }, '/');

    await user.click(screen.getByTestId('cart-button'));

    expect(navigateMock).toHaveBeenCalledWith(
      '/cart',
      expect.objectContaining({ state: expect.objectContaining({ background: expect.anything() }) }),
    );
  });
});
