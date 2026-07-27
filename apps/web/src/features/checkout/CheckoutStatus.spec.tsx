import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutStatus } from './CheckoutStatus';

jest.mock('@/lib/http', () => ({
  ...jest.requireActual('@/lib/http'),
  getJson: jest.fn(),
}));

const { getJson } = jest.requireMock('@/lib/http') as { getJson: jest.Mock };

function buildTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx-1',
    reference: 'ref-1',
    status: 'PENDING',
    productId: 'product-1',
    customerId: 'customer-1',
    quantity: 1,
    productAmountInCents: 100_000,
    baseFeeInCents: 500_000,
    deliveryFeeInCents: 800_000,
    totalAmountInCents: 1_400_000,
    currency: 'COP',
    providerTransactionId: 'gw-tx-1',
    providerStatus: 'PENDING',
    failureReason: null,
    ...overrides,
  };
}

describe('CheckoutStatus', () => {
  beforeEach(() => {
    getJson.mockReset();
  });

  it('shows a checking message before the first poll resolves', () => {
    getJson.mockReturnValue(new Promise(() => {}));
    render(<CheckoutStatus transactionId="tx-1" onDone={jest.fn()} />);

    expect(screen.getByText(/checking your payment/i)).toBeInTheDocument();
  });

  it('shows the approved result once settled', async () => {
    getJson.mockResolvedValueOnce(buildTransaction({ status: 'APPROVED' }));
    render(<CheckoutStatus transactionId="tx-1" onDone={jest.fn()} />);

    expect(await screen.findByTestId('checkout-status-result')).toHaveTextContent('Payment approved');
    expect(getJson).toHaveBeenCalledWith('/transactions/tx-1', expect.anything());
  });

  it('shows the declined result with the failure reason', async () => {
    getJson.mockResolvedValueOnce(
      buildTransaction({ status: 'DECLINED', failureReason: 'Provider status: DECLINED' }),
    );
    render(<CheckoutStatus transactionId="tx-1" onDone={jest.fn()} />);

    const result = await screen.findByTestId('checkout-status-result');
    expect(result).toHaveTextContent('Payment declined');
    expect(result).toHaveTextContent('Provider status: DECLINED');
  });

  it('keeps polling while PENDING and settles once the gateway approves', async () => {
    getJson
      .mockResolvedValueOnce(buildTransaction({ status: 'PENDING' }))
      .mockResolvedValueOnce(buildTransaction({ status: 'APPROVED' }));
    render(<CheckoutStatus transactionId="tx-1" onDone={jest.fn()} />);

    expect(screen.getByText(/checking your payment/i)).toBeInTheDocument();
    await waitFor(() => expect(getJson).toHaveBeenCalledTimes(2), { timeout: 5000 });
    expect(await screen.findByTestId('checkout-status-result')).toHaveTextContent('Payment approved');
  });

  it('shows an error message when the status check fails', async () => {
    getJson.mockRejectedValueOnce(new Error('network down'));
    render(<CheckoutStatus transactionId="tx-1" onDone={jest.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not check the payment status/i);
  });

  it('calls onDone when "Continue shopping" is clicked after settling', async () => {
    getJson.mockResolvedValueOnce(buildTransaction({ status: 'APPROVED' }));
    const onDone = jest.fn();
    const user = userEvent.setup();
    render(<CheckoutStatus transactionId="tx-1" onDone={onDone} />);

    await user.click(await screen.findByRole('button', { name: /continue shopping/i }));

    expect(onDone).toHaveBeenCalled();
  });
});
