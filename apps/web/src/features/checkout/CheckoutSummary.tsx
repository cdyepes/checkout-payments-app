import { useEffect, useState } from 'react';
import { TransactionResponseSchema } from '@checkout/contracts';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchProducts } from '@/features/products/products.slice';
import { selectCartItems, selectCartLines, selectCartSubtotalInCents } from '@/features/cart/cart.selectors';
import { formatMoney } from '@/lib/format-money';
import { HttpError, postJson } from '@/lib/http';
import styles from './CheckoutSummary.module.css';

// Mirrors the backend's fixed fee constants (apps/api/src/transactions/domain/fees.ts)
// purely for this pre-submission preview, charged once per cart (not per item) —
// the authoritative totals always come from the server's own TransactionResponse
// once the transaction actually exists.
const BASE_FEE_IN_CENTS = 500_000;
const DELIVERY_FEE_IN_CENTS = 800_000;

export interface CheckoutSummaryProps {
  cardToken: string;
  onSubmitted: (transactionId: string) => void;
}

export function CheckoutSummary({ cardToken, onSubmitted }: CheckoutSummaryProps) {
  const dispatch = useAppDispatch();
  const { customer, delivery } = useAppSelector((state) => state.checkout);
  const cartItems = useAppSelector(selectCartItems);
  const lines = useAppSelector(selectCartLines);
  const subtotalInCents = useAppSelector(selectCartSubtotalInCents);
  const { status } = useAppSelector((state) => state.products);
  // Set once the transaction is created so a retry after a payment-submission
  // failure re-attempts payment on the same transaction instead of creating another.
  const [createdTransactionId, setCreatedTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchProducts());
    }
  }, [status, dispatch]);

  async function handlePay() {
    if (cartItems.length === 0 || !customer || !delivery) return;
    setError(null);
    setIsSubmitting(true);

    try {
      let transactionId = createdTransactionId;
      if (!transactionId) {
        const transaction = await postJson(
          '/transactions',
          { items: cartItems, customer, delivery },
          TransactionResponseSchema,
        );
        transactionId = transaction.id;
        setCreatedTransactionId(transactionId);
      }

      await postJson(
        `/transactions/${transactionId}/payment`,
        { cardToken },
        TransactionResponseSchema,
      );
      onSubmitted(transactionId);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return <p className={styles.message}>Loading summary…</p>;
  }

  const totalInCents = subtotalInCents + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS;

  return (
    <div className={styles.summary} data-testid="checkout-summary">
      <h2 className={styles.title}>Payment summary</h2>

      <dl className={styles.lines}>
        {lines.map((line) => (
          <div className={styles.line} key={line.productId}>
            <dt>
              {line.product.name} &times; {line.quantity}
            </dt>
            <dd>{formatMoney(line.subtotalInCents, line.product.currency)}</dd>
          </div>
        ))}
        <div className={styles.line}>
          <dt>Base fee</dt>
          <dd>{formatMoney(BASE_FEE_IN_CENTS, 'COP')}</dd>
        </div>
        <div className={styles.line}>
          <dt>Delivery fee</dt>
          <dd>{formatMoney(DELIVERY_FEE_IN_CENTS, 'COP')}</dd>
        </div>
        <div className={`${styles.line} ${styles.total}`}>
          <dt>Total</dt>
          <dd>{formatMoney(totalInCents, 'COP')}</dd>
        </div>
      </dl>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className={styles.payButton}
        onClick={() => void handlePay()}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Processing…' : 'Pay now'}
      </button>
    </div>
  );
}
