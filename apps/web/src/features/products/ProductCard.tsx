import { useState } from 'react';
import type { ProductResponse } from '@checkout/contracts';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { addItem } from '@/features/cart/cart.slice';
import { formatMoney } from '@/lib/format-money';
import styles from './ProductCard.module.css';

const LOW_STOCK_THRESHOLD = 5;
const ADDED_FEEDBACK_MS = 1500;

export interface ProductCardProps {
  product: ProductResponse;
}

export function ProductCard({ product }: ProductCardProps) {
  const dispatch = useAppDispatch();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const alreadyInCart = useAppSelector(
    (state) => state.cart.items.find((item) => item.productId === product.id)?.quantity ?? 0,
  );

  const remainingStock = Math.max(0, product.stock - alreadyInCart);
  const isLowStock = product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
  const isOutOfStock = remainingStock === 0;

  function handleAddToCart() {
    dispatch(addItem({ productId: product.id, quantity }));
    setQuantity(1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), ADDED_FEEDBACK_MS);
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
            {product.stock === 0 ? 'Out of stock' : `${product.stock} in stock`}
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
                onClick={() => setQuantity((current) => Math.min(remainingStock, current + 1))}
                disabled={quantity >= remainingStock}
              >
                +
              </button>
            </div>
            <button type="button" className={styles.buyButton} onClick={handleAddToCart}>
              {justAdded ? 'Added ✓' : 'Add to cart'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
