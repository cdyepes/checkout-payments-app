import { useEffect, useState } from 'react';
import { TransactionResponseSchema } from '@checkout/contracts';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchProducts } from '@/features/products/products.slice';
import { formatMoney } from '@/lib/format-money';
import { HttpError, postJson } from '@/lib/http';
import styles from './CheckoutSummary.module.css';

// Mirrors the backend's fixed fee constants (apps/api/src/transactions/domain/fees.ts)
// purely for this pre-submission preview — the authoritative totals always come
// from the server's own TransactionResponse once the transaction actually exists.
const BASE_FEE_IN_CENTS = 500_000;
const DELIVERY_FEE_IN_CENTS = 800_000;

export interface CheckoutSummaryProps {
  cardToken: string;
  onSubmitted: (transactionId: string) => void;
}

export function CheckoutSummary({ cardToken, onSubmitted }: CheckoutSummaryProps) {
  const dispatch = useAppDispatch();
  const { productId, quantity, customer, delivery } = useAppSelector((state) => state.checkout);
  const { items, status } = useAppSelector((state) => state.products);
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

  const product = items.find((item) => item.id === productId);

  async function handlePay() {
    if (!productId || !customer || !delivery) return;
    setError(null);
    setIsSubmitting(true);

    try {
      let transactionId = createdTransactionId;
      if (!transactionId) {
        const transaction = await postJson(
          '/transactions',
          { productId, quantity, customer, delivery },
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

  if (!product) {
    return <p className={styles.message}>Loading summary…</p>;
  }

  const productAmountInCents = product.priceInCents * quantity;
  const totalInCents = productAmountInCents + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS;

  return (
    <div className={styles.summary} data-testid="checkout-summary">
      <h2 className={styles.title}>Payment summary</h2>

      <dl className={styles.lines}>
        <div className={styles.line}>
          <dt>
            {product.name} &times; {quantity}
          </dt>
          <dd>{formatMoney(productAmountInCents, product.currency)}</dd>
        </div>
        <div className={styles.line}>
          <dt>Base fee</dt>
          <dd>{formatMoney(BASE_FEE_IN_CENTS, product.currency)}</dd>
        </div>
        <div className={styles.line}>
          <dt>Delivery fee</dt>
          <dd>{formatMoney(DELIVERY_FEE_IN_CENTS, product.currency)}</dd>
        </div>
        <div className={`${styles.line} ${styles.total}`}>
          <dt>Total</dt>
          <dd>{formatMoney(totalInCents, product.currency)}</dd>
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
