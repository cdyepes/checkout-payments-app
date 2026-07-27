import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/render-with-store';
import { buildProduct } from '@/test/build-product';
import { HttpError } from '@/lib/http';
import { CheckoutSummary } from './CheckoutSummary';

jest.mock('@/lib/http', () => ({
  ...jest.requireActual('@/lib/http'),
  postJson: jest.fn(),
}));

const { postJson } = jest.requireMock('@/lib/http') as { postJson: jest.Mock };

const product = buildProduct({ id: 'product-1', priceInCents: 100_000, currency: 'COP' });

function buildPreloadedState(overrides: Record<string, unknown> = {}) {
  return {
    products: { items: [product], status: 'succeeded' as const, error: null },
    checkout: {
      step: 'summary' as const,
      productId: 'product-1',
      quantity: 2,
      customer: { email: 'jane@example.com', fullName: 'Jane Doe', phone: '+573001234567' },
      delivery: { addressLine: 'Calle 123', city: 'Bogotá', region: 'Cundinamarca', country: 'CO' },
      transactionId: null,
      ...overrides,
    },
  };
}

function buildTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx-1',
    reference: 'ref-1',
    status: 'PENDING',
    productId: 'product-1',
    customerId: 'customer-1',
    quantity: 2,
    productAmountInCents: 200_000,
    baseFeeInCents: 500_000,
    deliveryFeeInCents: 800_000,
    totalAmountInCents: 1_500_000,
    currency: 'COP',
    providerTransactionId: null,
    providerStatus: null,
    failureReason: null,
    ...overrides,
  };
}

describe('CheckoutSummary', () => {
  beforeEach(() => {
    postJson.mockReset();
  });

  it('shows a loading message until the product is available', () => {
    renderWithStore(
      <CheckoutSummary cardToken="tok_test_1" onSubmitted={jest.fn()} />,
      { products: { items: [], status: 'loading', error: null }, checkout: buildPreloadedState().checkout },
    );

    expect(screen.getByText(/loading summary/i)).toBeInTheDocument();
  });

  it('renders the fee breakdown for the selected product and quantity', () => {
    renderWithStore(
      <CheckoutSummary cardToken="tok_test_1" onSubmitted={jest.fn()} />,
      buildPreloadedState(),
    );

    expect(screen.getByText(/Keyboard × 2/)).toBeInTheDocument();
    expect(screen.getByText('$ 2.000')).toBeInTheDocument();
    expect(screen.getByText('$ 5.000')).toBeInTheDocument();
    expect(screen.getByText('$ 8.000')).toBeInTheDocument();
    expect(screen.getByText('$ 15.000')).toBeInTheDocument();
  });

  it('creates the transaction, submits payment, and calls onSubmitted with the transaction id', async () => {
    postJson.mockResolvedValueOnce(buildTransaction()).mockResolvedValueOnce(buildTransaction());
    const onSubmitted = jest.fn();
    const user = userEvent.setup();
    renderWithStore(
      <CheckoutSummary cardToken="tok_test_1" onSubmitted={onSubmitted} />,
      buildPreloadedState(),
    );

    await user.click(screen.getByRole('button', { name: /pay now/i }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('tx-1'));
    expect(postJson).toHaveBeenNthCalledWith(
      1,
      '/transactions',
      {
        productId: 'product-1',
        quantity: 2,
        customer: { email: 'jane@example.com', fullName: 'Jane Doe', phone: '+573001234567' },
        delivery: { addressLine: 'Calle 123', city: 'Bogotá', region: 'Cundinamarca', country: 'CO' },
      },
      expect.anything(),
    );
    expect(postJson).toHaveBeenNthCalledWith(
      2,
      '/transactions/tx-1/payment',
      { cardToken: 'tok_test_1' },
      expect.anything(),
    );
  });

  it('shows an error and allows retrying from scratch when transaction creation fails', async () => {
    postJson.mockRejectedValueOnce(new HttpError(409, 'Not enough stock available'));
    const onSubmitted = jest.fn();
    const user = userEvent.setup();
    renderWithStore(
      <CheckoutSummary cardToken="tok_test_1" onSubmitted={onSubmitted} />,
      buildPreloadedState(),
    );

    await user.click(screen.getByRole('button', { name: /pay now/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Not enough stock available');
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(postJson).toHaveBeenCalledTimes(1);
  });

  it('reuses the already-created transaction on retry when only payment submission failed', async () => {
    postJson
      .mockResolvedValueOnce(buildTransaction())
      .mockRejectedValueOnce(new HttpError(500, 'Gateway unreachable'))
      .mockResolvedValueOnce(buildTransaction());
    const onSubmitted = jest.fn();
    const user = userEvent.setup();
    renderWithStore(
      <CheckoutSummary cardToken="tok_test_1" onSubmitted={onSubmitted} />,
      buildPreloadedState(),
    );

    await user.click(screen.getByRole('button', { name: /pay now/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Gateway unreachable');

    await user.click(screen.getByRole('button', { name: /pay now/i }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('tx-1'));

    expect(postJson).toHaveBeenCalledTimes(3);
    expect(postJson).toHaveBeenNthCalledWith(1, '/transactions', expect.anything(), expect.anything());
    expect(postJson).toHaveBeenNthCalledWith(
      2,
      '/transactions/tx-1/payment',
      expect.anything(),
      expect.anything(),
    );
    expect(postJson).toHaveBeenNthCalledWith(
      3,
      '/transactions/tx-1/payment',
      expect.anything(),
      expect.anything(),
    );
  });
});
