import type { ProductResponse } from '@checkout/contracts';

export function buildProduct(overrides: Partial<ProductResponse> = {}): ProductResponse {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Keyboard',
    description: 'A mechanical keyboard',
    imageUrl: 'https://example.com/keyboard.jpg',
    priceInCents: 32900000,
    currency: 'COP',
    stock: 14,
    ...overrides,
  };
}
