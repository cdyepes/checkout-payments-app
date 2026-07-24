import type { ProductResponse } from '@checkout/contracts';
import { formatMoney } from '@/lib/format-money';
import styles from './ProductCard.module.css';

const LOW_STOCK_THRESHOLD = 5;

export interface ProductCardProps {
  product: ProductResponse;
}

export function ProductCard({ product }: ProductCardProps) {
  const isLowStock = product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
  const isOutOfStock = product.stock === 0;

  return (
    <article className={styles.card} data-testid="product-card">
      <div className={styles.imageWrap}>
        <img className={styles.image} src={product.imageUrl} alt={product.name} loading="lazy" />
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.description}>{product.description}</p>
        <div className={styles.footer}>
          <span className={styles.price}>{formatMoney(product.priceInCents, product.currency)}</span>
          <span className={`${styles.stock} ${isLowStock ? styles.stockLow : ''}`}>
            {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
          </span>
        </div>
      </div>
    </article>
  );
}
