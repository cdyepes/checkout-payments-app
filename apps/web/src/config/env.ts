// Isolated from the rest of the app because `import.meta.env` is Vite-only
// syntax: Jest maps this module to env.jest.ts instead of transforming it.
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  paymentsPublicKey: import.meta.env.VITE_PAYMENTS_PUBLIC_KEY ?? '',
};
