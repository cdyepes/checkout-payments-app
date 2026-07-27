import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test/render-with-store';
import { PaymentGatewayError } from '@/lib/payments-gateway';
import { CardDeliveryForm } from './CardDeliveryForm';

jest.mock('@/lib/payments-gateway', () => ({
  ...jest.requireActual('@/lib/payments-gateway'),
  tokenizeCard: jest.fn(),
}));

const { tokenizeCard } = jest.requireMock('@/lib/payments-gateway') as {
  tokenizeCard: jest.Mock;
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
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
}

describe('CardDeliveryForm', () => {
  beforeEach(() => {
    tokenizeCard.mockReset();
  });

  it('renders all sections', () => {
    renderWithStore(<CardDeliveryForm onTokenized={jest.fn()} />);

    expect(screen.getByText('Contact info')).toBeInTheDocument();
    expect(screen.getByText('Delivery address')).toBeInTheDocument();
    expect(screen.getByText('Card details')).toBeInTheDocument();
  });

  it('detects and displays the card brand while typing', async () => {
    const user = userEvent.setup();
    renderWithStore(<CardDeliveryForm onTokenized={jest.fn()} />);

    await user.type(screen.getByLabelText(/Card number/i), '4242424242424242');

    expect(screen.getByTestId('card-brand')).toHaveTextContent('Visa');
  });

  it('formats the card number and expiry as the user types', async () => {
    const user = userEvent.setup();
    renderWithStore(<CardDeliveryForm onTokenized={jest.fn()} />);

    await user.type(screen.getByLabelText(/Card number/i), '4242424242424242');
    await user.type(screen.getByLabelText(/Expiry/i), '1229');

    expect(screen.getByLabelText(/Card number/i)).toHaveValue('4242 4242 4242 4242');
    expect(screen.getByLabelText(/Expiry/i)).toHaveValue('12/29');
  });

  it('shows validation errors and does not tokenize when the form is empty', async () => {
    const user = userEvent.setup();
    const onTokenized = jest.fn();
    renderWithStore(<CardDeliveryForm onTokenized={onTokenized} />);

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText('Enter a valid card number')).toBeInTheDocument();
    expect(screen.getByText('Card holder name is required')).toBeInTheDocument();
    expect(tokenizeCard).not.toHaveBeenCalled();
    expect(onTokenized).not.toHaveBeenCalled();
  });

  it('tokenizes the card, saves customer/delivery to the store, and calls onTokenized', async () => {
    tokenizeCard.mockResolvedValueOnce('tok_test_1');
    const user = userEvent.setup();
    const onTokenized = jest.fn();
    const { store } = renderWithStore(<CardDeliveryForm onTokenized={onTokenized} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(onTokenized).toHaveBeenCalledWith('tok_test_1'));
    expect(tokenizeCard).toHaveBeenCalledWith({
      number: '4242424242424242',
      cvc: '123',
      expMonth: '12',
      expYear: '29',
      cardHolder: 'Jane Doe',
    });
    expect(store.getState().checkout.customer).toEqual({
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      phone: '+573001234567',
    });
    expect(store.getState().checkout.delivery).toMatchObject({
      addressLine: 'Calle 123 #45-67',
      city: 'Bogotá',
      country: 'CO',
    });
  });

  it('shows a gateway error and does not call onTokenized when tokenization fails', async () => {
    tokenizeCard.mockRejectedValueOnce(new PaymentGatewayError('Could not verify the card.'));
    const user = userEvent.setup();
    const onTokenized = jest.fn();
    const { store } = renderWithStore(<CardDeliveryForm onTokenized={onTokenized} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not verify the card.');
    expect(onTokenized).not.toHaveBeenCalled();
    expect(store.getState().checkout.customer).toBeNull();
  });
});
