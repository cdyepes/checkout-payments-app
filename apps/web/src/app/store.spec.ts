import { migrations } from './store';

describe('persist migrations', () => {
  it('drops a pre-cart checkout blob (v1) but leaves other persisted keys untouched', () => {
    const migrated = migrations[1]({
      _persist: { version: -1, rehydrated: true },
      checkout: { step: 'summary', productId: 'product-1', quantity: 2 },
      cart: { items: [] },
    } as never);

    expect(migrated).not.toHaveProperty('checkout');
    expect(migrated).toMatchObject({ cart: { items: [] } });
  });

  it('passes through a falsy state unchanged (nothing to migrate yet)', () => {
    expect(migrations[1](undefined)).toBeUndefined();
  });
});
