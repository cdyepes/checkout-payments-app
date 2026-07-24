import { screen, waitFor } from '@testing-library/react';
import { renderWithStore } from '@/test/render-with-store';
import { buildProduct } from '@/test/build-product';
import { ProductPage } from './ProductPage';

describe('ProductPage', () => {
  it('shows a loading message while products are loading', () => {
    renderWithStore(<ProductPage />, {
      products: { items: [], status: 'loading', error: null },
    });

    expect(screen.getByText('Loading products…')).toBeInTheDocument();
  });

  it('shows an error message when loading failed', () => {
    renderWithStore(<ProductPage />, {
      products: { items: [], status: 'failed', error: 'Network error' },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
  });

  it('shows a generic error message when the failure carries no message', () => {
    renderWithStore(<ProductPage />, {
      products: { items: [], status: 'failed', error: null },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong loading the store.');
  });

  it('shows an empty-state message when there are no products', () => {
    renderWithStore(<ProductPage />, {
      products: { items: [], status: 'succeeded', error: null },
    });

    expect(screen.getByText('No products available right now.')).toBeInTheDocument();
  });

  it('renders a card per product once loaded', () => {
    renderWithStore(<ProductPage />, {
      products: {
        items: [
          buildProduct(),
          buildProduct({ id: '22222222-2222-4222-8222-222222222222', name: 'Mouse' }),
        ],
        status: 'succeeded',
        error: null,
      },
    });

    expect(screen.getAllByTestId('product-card')).toHaveLength(2);
  });

  it('fetches products on mount when state is idle', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [buildProduct()],
    } as Response);

    renderWithStore(<ProductPage />);

    await waitFor(() => expect(screen.getByText('Keyboard')).toBeInTheDocument());
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/products'));

    fetchSpy.mockRestore();
  });
});
