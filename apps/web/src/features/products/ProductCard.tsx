import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ProductResponse } from '@checkout/contracts';
import { useAppDispatch } from '@/app/hooks';
import { startCheckout } from '@/features/checkout/checkout.slice';
import { formatMoney } from '@/lib/format-money';
import styles from './ProductCard.module.css';

const LOW_STOCK_THRESHOLD = 5;

export interface ProductCardProps {
  product: ProductResponse;
}

export function ProductCard({ product }: ProductCardProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [quantity, setQuantity] = useState(1);

  const isLowStock = product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
  const isOutOfStock = product.stock === 0;

  function handleBuy() {
    dispatch(startCheckout({ productId: product.id, quantity }));
    navigate('/checkout/details', { state: { background: location } });
  }

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

        {!isOutOfStock && (
          <div className={styles.buyRow}>
            <div className={styles.stepper}>
              <button
                type="button"
                aria-label={`Decrease quantity of ${product.name}`}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                disabled={quantity <= 1}
              >
                &minus;
              </button>
              <span data-testid="quantity-value">{quantity}</span>
              <button
                type="button"
                aria-label={`Increase quantity of ${product.name}`}
                onClick={() => setQuantity((current) => Math.min(product.stock, current + 1))}
                disabled={quantity >= product.stock}
              >
                +
              </button>
            </div>
            <button type="button" className={styles.buyButton} onClick={handleBuy}>
              Buy
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
