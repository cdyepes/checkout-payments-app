import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectCartItemCount } from './cart.selectors';
import styles from './CartButton.module.css';

export function CartButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const itemCount = useAppSelector(selectCartItemCount);

  function handleClick() {
    navigate('/cart', { state: { background: location } });
  }

  return (
    <button
      type="button"
      className={styles.button}
      onClick={handleClick}
      aria-label={`View cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`}
      data-testid="cart-button"
    >
      Cart
      {itemCount > 0 && (
        <span className={styles.badge} data-testid="cart-badge">
          {itemCount}
        </span>
      )}
    </button>
  );
}
