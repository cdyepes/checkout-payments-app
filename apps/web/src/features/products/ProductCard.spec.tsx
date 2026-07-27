import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/render-with-store';
import { ProductCard } from './ProductCard';
import { buildProduct } from '@/test/build-product';

const navigateMock = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigateMock,
}));

describe('ProductCard', () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it('renders the product name, description and formatted price', () => {
    renderWithStore(<ProductCard product={buildProduct()} />);

    expect(screen.getByText('Keyboard')).toBeInTheDocument();
    expect(screen.getByText('A mechanical keyboard')).toBeInTheDocument();
    expect(screen.getByText(/329\.000/)).toBeInTheDocument();
  });

  it('shows remaining stock when in stock', () => {
    renderWithStore(<ProductCard product={buildProduct({ stock: 14 })} />);
    expect(screen.getByText('14 in stock')).toBeInTheDocument();
  });

  it('flags out-of-stock products', () => {
    renderWithStore(<ProductCard product={buildProduct({ stock: 0 })} />);
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('flags low-stock products without marking them out of stock', () => {
    renderWithStore(<ProductCard product={buildProduct({ stock: 3 })} />);
    expect(screen.getByText('3 in stock')).toBeInTheDocument();
  });

  it('hides the quantity stepper and buy button when out of stock', () => {
    renderWithStore(<ProductCard product={buildProduct({ stock: 0 })} />);
    expect(screen.queryByRole('button', { name: /buy/i })).not.toBeInTheDocument();
  });

  it('clamps the quantity stepper between 1 and the available stock', async () => {
    const user = userEvent.setup();
    const product = buildProduct({ name: 'Widget', stock: 2 });
    renderWithStore(<ProductCard product={product} />);

    const decrease = screen.getByRole('button', { name: /decrease quantity/i });
    const increase = screen.getByRole('button', { name: /increase quantity/i });

    expect(decrease).toBeDisabled();
    expect(screen.getByTestId('quantity-value')).toHaveTextContent('1');

    await user.click(increase);
    expect(screen.getByTestId('quantity-value')).toHaveTextContent('2');
    expect(increase).toBeDisabled();

    await user.click(decrease);
    expect(screen.getByTestId('quantity-value')).toHaveTextContent('1');
  });

  it('starts checkout with the selected quantity and navigates to the details modal', async () => {
    const user = userEvent.setup();
    const product = buildProduct({ id: 'product-42', stock: 5 });
    const { store } = renderWithStore(<ProductCard product={product} />);

    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    await user.click(screen.getByRole('button', { name: /^buy$/i }));

    expect(store.getState().checkout).toMatchObject({
      step: 'details',
      productId: 'product-42',
      quantity: 2,
    });
    expect(navigateMock).toHaveBeenCalledWith(
      '/checkout/details',
      expect.objectContaining({ state: expect.objectContaining({ background: expect.anything() }) }),
    );
  });
});
