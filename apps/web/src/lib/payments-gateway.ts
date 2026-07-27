import { env } from '@/config/env';

export class PaymentGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentGatewayError';
  }
}

export interface TokenizeCardInput {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  cardHolder: string;
}

interface TokenizeCardResponse {
  status: string;
  data: { id: string };
}

// Tokenizes the card directly with the payment provider using the public key —
// the raw card number/CVC go straight from the browser to the provider and are
// never sent to our backend, which only ever receives the resulting token.
export async function tokenizeCard(input: TokenizeCardInput): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${env.paymentsApiUrl}/tokens/cards`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.paymentsPublicKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: input.number,
        cvc: input.cvc,
        exp_month: input.expMonth,
        exp_year: input.expYear,
        card_holder: input.cardHolder,
      }),
    });
  } catch {
    throw new PaymentGatewayError('Could not reach the payment provider. Please try again.');
  }

  const body = (await response.json().catch(() => null)) as TokenizeCardResponse | null;

  if (!response.ok || !body) {
    throw new PaymentGatewayError('Could not verify the card. Please check the details and try again.');
  }

  return body.data.id;
}
