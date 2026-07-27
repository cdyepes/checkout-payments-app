import { useEffect, useState } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { resetCheckout, setStep } from './checkout.slice';
import { CardDeliveryForm } from './CardDeliveryForm';
import { CheckoutPlaceholder } from './CheckoutPlaceholder';
import styles from './CheckoutModal.module.css';

interface CheckoutLocationState {
  background?: Location;
}

export function CheckoutModal() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { step, productId } = useAppSelector((state) => state.checkout);
  // The card token lives only here, in this component's own state — never in
  // Redux, never in localStorage — so it survives the details -> summary step
  // transition (this component stays mounted across it) but nothing else.
  const [cardToken, setCardToken] = useState<string | null>(null);

  const background = (location.state as CheckoutLocationState | null)?.background;
  const isOverlay = Boolean(background);

  useEffect(() => {
    if (!productId) {
      navigate('/', { replace: true });
    }
  }, [productId, navigate]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!productId) return null;

  function close() {
    dispatch(resetCheckout());
    navigate('/');
  }

  function handleTokenized(token: string) {
    setCardToken(token);
    dispatch(setStep('summary'));
    navigate('/checkout/summary', background ? { state: { background } } : undefined);
  }

  const content = (
    <div className={styles.modal} role="dialog" aria-modal="true" data-testid="checkout-modal">
      <button
        type="button"
        className={styles.close}
        aria-label="Close checkout"
        onClick={close}
      >
        &times;
      </button>

      {step === 'details' && <CardDeliveryForm onTokenized={handleTokenized} />}
      {step === 'summary' && (
        <CheckoutPlaceholder
          title={cardToken ? 'Payment summary — card verified' : 'Payment summary'}
        />
      )}
      {step === 'status' && <CheckoutPlaceholder title="Payment status" />}
    </div>
  );

  if (!isOverlay) {
    return <div className={styles.page}>{content}</div>;
  }

  return (
    <div className={styles.backdrop} data-testid="checkout-backdrop" onClick={close}>
      <div onClick={(event) => event.stopPropagation()}>{content}</div>
    </div>
  );
}
