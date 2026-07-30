import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { CartButton } from '@/features/cart/CartButton';
import { fetchProducts } from './products.slice';
import { ProductCard } from './ProductCard';
import styles from './ProductPage.module.css';

export function ProductPage() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.products);

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchProducts());
    }
  }, [status, dispatch]);

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Store</h1>
        <CartButton />
      </div>

      {status === 'loading' && <p className={styles.message}>Loading products…</p>}

      {status === 'failed' && (
        <p className={styles.message} role="alert">
          {error ?? 'Something went wrong loading the store.'}
        </p>
      )}

      {status === 'succeeded' && items.length === 0 && (
        <p className={styles.message}>No products available right now.</p>
      )}

      {status === 'succeeded' && items.length > 0 && (
        <div className={styles.grid}>
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
