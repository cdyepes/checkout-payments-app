import { useEffect, useState } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchProducts } from '@/features/products/products.slice';
import { resetCheckout, setStep, setTransactionId } from './checkout.slice';
import { CardDeliveryForm } from './CardDeliveryForm';
import { CheckoutSummary } from './CheckoutSummary';
import { CheckoutStatus } from './CheckoutStatus';
import styles from './CheckoutModal.module.css';

interface CheckoutLocationState {
  background?: Location;
}

export function CheckoutModal() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { step, productId, transactionId } = useAppSelector((state) => state.checkout);
  // The card token lives only here, in this component's own state — never in
  // Redux, never in localStorage — so it survives the details -> summary step
  // transition (this component stays mounted across it) but nothing else.
  const [cardToken, setCardToken] = useState<string | null>(null);

  const background = (location.state as CheckoutLocationState | null)?.background;
  const isOverlay = Boolean(background);

  function close() {
    dispatch(resetCheckout());
    navigate('/');
  }

  useEffect(() => {
    if (!productId) {
      navigate('/', { replace: true });
    }
  }, [productId, navigate]);

  // Runs once on mount only, to recover from a hard refresh that dropped
  // in-memory-only state (the card token) while the persisted step survived.
  // Deliberately NOT reactive to step/cardToken changes: those transition
  // together within a live session (see handleTokenized/handleSubmitted) and
  // re-checking on every change risks racing an in-flight transition against
  // this guard, since the card token (React state) and step (Redux) don't
  // necessarily commit in the same render.
  useEffect(() => {
    if (!productId) return;
    if (step === 'summary' && !cardToken) {
      dispatch(setStep('details'));
      navigate('/checkout/details', background ? { state: { background } } : { replace: true });
    } else if (step === 'status' && !transactionId) {
      navigate('/', { replace: true });
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!productId) return null;
  if (step === 'summary' && !cardToken) return null;
  if (step === 'status' && !transactionId) return null;

  function handleTokenized(token: string) {
    setCardToken(token);
    dispatch(setStep('summary'));
    navigate('/checkout/summary', background ? { state: { background } } : undefined);
  }

  function handleSubmitted(newTransactionId: string) {
    dispatch(setTransactionId(newTransactionId));
    dispatch(setStep('status'));
    navigate('/checkout/status', background ? { state: { background } } : undefined);
  }

  function finishCheckout() {
    dispatch(resetCheckout());
    void dispatch(fetchProducts());
    navigate('/');
  }

  const content = (
    <div className={styles.modal} role="dialog" aria-modal="true" data-testid="checkout-modal">
      <button type="button" className={styles.close} aria-label="Close checkout" onClick={close}>
        &times;
      </button>

      {step === 'details' && <CardDeliveryForm onTokenized={handleTokenized} />}
      {step === 'summary' && cardToken && (
        <CheckoutSummary cardToken={cardToken} onSubmitted={handleSubmitted} />
      )}
      {step === 'status' && transactionId && (
        <CheckoutStatus transactionId={transactionId} onDone={finishCheckout} />
      )}
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
