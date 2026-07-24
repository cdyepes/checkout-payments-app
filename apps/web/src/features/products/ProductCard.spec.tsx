import { render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import { buildProduct } from '@/test/build-product';

describe('ProductCard', () => {
  it('renders the product name, description and formatted price', () => {
    render(<ProductCard product={buildProduct()} />);

    expect(screen.getByText('Keyboard')).toBeInTheDocument();
    expect(screen.getByText('A mechanical keyboard')).toBeInTheDocument();
    expect(screen.getByText(/329\.000/)).toBeInTheDocument();
  });

  it('shows remaining stock when in stock', () => {
    render(<ProductCard product={buildProduct({ stock: 14 })} />);
    expect(screen.getByText('14 in stock')).toBeInTheDocument();
  });

  it('flags out-of-stock products', () => {
    render(<ProductCard product={buildProduct({ stock: 0 })} />);
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('flags low-stock products without marking them out of stock', () => {
    render(<ProductCard product={buildProduct({ stock: 3 })} />);
    expect(screen.getByText('3 in stock')).toBeInTheDocument();
  });
});
