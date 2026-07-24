import { validateEnv } from './env.schema';

const validConfig = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  CORS_ORIGIN: 'http://localhost:5173',
  PAYMENTS_API_URL: 'https://api-sandbox.example.dev/v1',
};

describe('validateEnv', () => {
  it('applies defaults and coerces PORT to a number', () => {
    const env = validateEnv(validConfig);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
  });

  it('accepts an explicit PORT and NODE_ENV', () => {
    const env = validateEnv({ ...validConfig, PORT: '4000', NODE_ENV: 'production' });

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('production');
  });

  it('throws when a required variable is missing', () => {
    const { DATABASE_URL: _drop, ...rest } = validConfig;
    expect(() => validateEnv(rest)).toThrow(/Invalid environment configuration/);
  });

  it('throws when PAYMENTS_API_URL is not a valid URL', () => {
    expect(() => validateEnv({ ...validConfig, PAYMENTS_API_URL: 'not-a-url' })).toThrow();
  });
});
