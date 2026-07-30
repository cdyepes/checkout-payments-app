import { useEffect } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { beginCheckout } from '@/features/checkout/checkout.slice';
import { fetchProducts } from '@/features/products/products.slice';
import { formatMoney } from '@/lib/format-money';
import { removeItem, setItemQuantity } from './cart.slice';
import { selectCartLines, selectCartSubtotalInCents } from './cart.selectors';
import styles from './CartPanel.module.css';

interface CartLocationState {
  background?: Location;
}

export function CartPanel() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const lines = useAppSelector(selectCartLines);
  const subtotalInCents = useAppSelector(selectCartSubtotalInCents);
  const productsStatus = useAppSelector((state) => state.products.status);

  const background = (location.state as CartLocationState | null)?.background;
  const isOverlay = Boolean(background);

  // A direct load of /cart (no background location, so ProductPage never mounts
  // underneath) means nothing has fetched the catalogue yet — without this,
  // selectCartLines has no products to join the persisted cart items against and
  // renders an empty cart even though localStorage has real items in it.
  useEffect(() => {
    if (productsStatus === 'idle') {
      void dispatch(fetchProducts());
    }
  }, [productsStatus, dispatch]);

  function close() {
    navigate('/');
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleContinue() {
    dispatch(beginCheckout());
    navigate('/checkout/details', background ? { state: { background } } : undefined);
  }

  const content = (
    <div className={styles.panel} role="dialog" aria-modal="true" data-testid="cart-panel">
      <button type="button" className={styles.close} aria-label="Close cart" onClick={close}>
        &times;
      </button>

      <h2 className={styles.title}>Your cart</h2>

      {lines.length === 0 && <p className={styles.message}>Your cart is empty.</p>}

      {lines.length > 0 && (
        <>
          <ul className={styles.lines} data-testid="cart-lines">
            {lines.map((line) => (
              <li key={line.productId} className={styles.line}>
                <img className={styles.thumb} src={line.product.imageUrl} alt={line.product.name} />
                <div className={styles.lineBody}>
                  <p className={styles.lineName}>{line.product.name}</p>
                  <div className={styles.stepper}>
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${line.product.name}`}
                      onClick={() =>
                        dispatch(
                          setItemQuantity({
                            productId: line.productId,
                            quantity: Math.max(1, line.quantity - 1),
                          }),
                        )
                      }
                      disabled={line.quantity <= 1}
                    >
                      &minus;
                    </button>
                    <span data-testid="cart-quantity-value">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${line.product.name}`}
                      onClick={() =>
                        dispatch(
                          setItemQuantity({
                            productId: line.productId,
                            quantity: Math.min(line.product.stock, line.quantity + 1),
                          }),
                        )
                      }
                      disabled={line.quantity >= line.product.stock}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className={styles.lineEnd}>
                  <span className={styles.lineSubtotal}>
                    {formatMoney(line.subtotalInCents, line.product.currency)}
                  </span>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Remove ${line.product.name} from cart`}
                    onClick={() => dispatch(removeItem({ productId: line.productId }))}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.summaryRow}>
            <span>Subtotal</span>
            <span className={styles.subtotal}>{formatMoney(subtotalInCents, 'COP')}</span>
          </div>
          <p className={styles.feesNote}>Delivery and service fees are calculated at checkout.</p>

          <button type="button" className={styles.continueButton} onClick={handleContinue}>
            Continue to checkout
          </button>
        </>
      )}
    </div>
  );

  if (!isOverlay) {
    return <div className={styles.page}>{content}</div>;
  }

  return (
    <div className={styles.backdrop} data-testid="cart-backdrop" onClick={close}>
      <div onClick={(event) => event.stopPropagation()}>{content}</div>
    </div>
  );
}
