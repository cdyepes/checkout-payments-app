import { useEffect, useState } from 'react';
import { TransactionResponseSchema, type TransactionResponse } from '@checkout/contracts';
import { getJson } from '@/lib/http';
import styles from './CheckoutStatus.module.css';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

export interface CheckoutStatusProps {
  transactionId: string;
  onDone: (settledStatus: TransactionResponse['status']) => void;
}

const RESULT_COPY: Record<string, { title: string; tone: 'success' | 'failure' }> = {
  APPROVED: { title: 'Payment approved', tone: 'success' },
  DECLINED: { title: 'Payment declined', tone: 'failure' },
  ERROR: { title: 'Payment failed', tone: 'failure' },
  VOIDED: { title: 'Payment voided', tone: 'failure' },
};

export function CheckoutStatus({ transactionId, onDone }: CheckoutStatusProps) {
  const [transaction, setTransaction] = useState<TransactionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      attempts += 1;
      try {
        const result = await getJson(`/transactions/${transactionId}`, TransactionResponseSchema);
        if (cancelled) return;
        setTransaction(result);
        setError(null);

        if (result.status === 'PENDING') {
          if (attempts >= MAX_POLL_ATTEMPTS) {
            setTimedOut(true);
            return;
          }
          timeoutId = setTimeout(() => void poll(), POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setError('Could not check the payment status. Please try again shortly.');
      }
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [transactionId]);

  const isSettled = transaction !== null && transaction.status !== 'PENDING';
  const resultCopy = transaction ? RESULT_COPY[transaction.status] : undefined;

  return (
    <div className={styles.status} data-testid="checkout-status">
      <h2 className={styles.title}>Payment status</h2>

      {!isSettled && !timedOut && !error && (
        <p className={styles.message}>Checking your payment…</p>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {timedOut && !isSettled && (
        <p className={styles.message}>
          This is taking longer than expected. We&apos;ll keep processing your payment — check back
          soon.
        </p>
      )}

      {isSettled && resultCopy && (
        <div
          className={`${styles.result} ${styles[resultCopy.tone]}`}
          data-testid="checkout-status-result"
        >
          <p className={styles.resultTitle}>{resultCopy.title}</p>
          {transaction?.failureReason && (
            <p className={styles.failureReason}>{transaction.failureReason}</p>
          )}
        </div>
      )}

      {isSettled && transaction && (
        <button
          type="button"
          className={styles.continueButton}
          onClick={() => onDone(transaction.status)}
        >
          Continue shopping
        </button>
      )}

      {timedOut && !isSettled && (
        <button type="button" className={styles.continueButton} onClick={() => onDone('PENDING')}>
          Continue shopping
        </button>
      )}
    </div>
  );
}
