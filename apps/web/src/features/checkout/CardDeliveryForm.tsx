import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppDispatch } from '@/app/hooks';
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiryInput,
  maxFormattedLength,
  parseExpiry,
} from '@/lib/card';
import { PaymentGatewayError, tokenizeCard } from '@/lib/payments-gateway';
import { setCustomerAndDelivery } from './checkout.slice';
import { CheckoutDetailsFormSchema, type CheckoutDetailsFormValues } from './checkout-details.schema';
import styles from './CardDeliveryForm.module.css';

export interface CardDeliveryFormProps {
  onTokenized: (cardToken: string) => void;
}

const defaultValues: CheckoutDetailsFormValues = {
  customer: { email: '', fullName: '', phone: '' },
  delivery: { addressLine: '', city: '', region: '', country: 'CO', postalCode: '' },
  card: { cardNumber: '', cardHolder: '', expiry: '', cvc: '' },
};

export function CardDeliveryForm({ onTokenized }: CardDeliveryFormProps) {
  const dispatch = useAppDispatch();
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutDetailsFormValues>({
    resolver: zodResolver(CheckoutDetailsFormSchema),
    defaultValues,
  });

  const cardNumberField = register('card.cardNumber');
  const expiryField = register('card.expiry');
  const cvcField = register('card.cvc');
  const cardBrand = detectCardBrand(watch('card.cardNumber'));

  async function onSubmit(values: CheckoutDetailsFormValues) {
    setGatewayError(null);
    const expiry = parseExpiry(values.card.expiry);
    if (!expiry) return;

    try {
      const cardToken = await tokenizeCard({
        number: values.card.cardNumber.replace(/\D/g, ''),
        cvc: values.card.cvc,
        expMonth: expiry.month,
        expYear: expiry.year,
        cardHolder: values.card.cardHolder,
      });

      // The form schema accepts '' for the optional postal code (an
      // uncontrolled input left blank submits '', not undefined — see
      // checkout-details.schema.ts), but the API contract only accepts a
      // real value or an absent key, so it gets normalized back out here.
      const delivery = { ...values.delivery, postalCode: values.delivery.postalCode || undefined };
      dispatch(setCustomerAndDelivery({ customer: values.customer, delivery }));
      onTokenized(cardToken);
    } catch (error) {
      setGatewayError(
        error instanceof PaymentGatewayError
          ? error.message
          : 'Something went wrong verifying your card. Please try again.',
      );
    }
  }

  return (
    <form
      className={styles.form}
      data-testid="checkout-details-form"
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      noValidate
    >
      <fieldset className={styles.section}>
        <legend className={styles.legend}>Contact info</legend>

        <div className={styles.field}>
          <label htmlFor="customer.email">Email</label>
          <input id="customer.email" type="email" autoComplete="email" {...register('customer.email')} />
          {errors.customer?.email && <p className={styles.error}>{errors.customer.email.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="customer.fullName">Full name</label>
          <input id="customer.fullName" autoComplete="name" {...register('customer.fullName')} />
          {errors.customer?.fullName && (
            <p className={styles.error}>{errors.customer.fullName.message}</p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="customer.phone">Phone</label>
          <input id="customer.phone" autoComplete="tel" {...register('customer.phone')} />
          {errors.customer?.phone && <p className={styles.error}>{errors.customer.phone.message}</p>}
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Delivery address</legend>

        <div className={styles.field}>
          <label htmlFor="delivery.addressLine">Address</label>
          <input
            id="delivery.addressLine"
            autoComplete="address-line1"
            {...register('delivery.addressLine')}
          />
          {errors.delivery?.addressLine && (
            <p className={styles.error}>{errors.delivery.addressLine.message}</p>
          )}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="delivery.city">City</label>
            <input id="delivery.city" autoComplete="address-level2" {...register('delivery.city')} />
            {errors.delivery?.city && <p className={styles.error}>{errors.delivery.city.message}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="delivery.region">Region</label>
            <input
              id="delivery.region"
              autoComplete="address-level1"
              {...register('delivery.region')}
            />
            {errors.delivery?.region && <p className={styles.error}>{errors.delivery.region.message}</p>}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="delivery.country">Country</label>
            <input
              id="delivery.country"
              maxLength={2}
              autoComplete="country"
              {...register('delivery.country')}
            />
            {errors.delivery?.country && (
              <p className={styles.error}>{errors.delivery.country.message}</p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="delivery.postalCode">Postal code (optional)</label>
            <input
              id="delivery.postalCode"
              autoComplete="postal-code"
              {...register('delivery.postalCode')}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.legend}>Card details</legend>

        <div className={styles.field}>
          <label htmlFor="card.cardNumber">
            Card number
            {cardBrand !== 'unknown' && (
              <span className={styles.brand} data-testid="card-brand">
                {cardBrand === 'visa' ? 'Visa' : 'Mastercard'}
              </span>
            )}
          </label>
          <input
            id="card.cardNumber"
            inputMode="numeric"
            autoComplete="cc-number"
            maxLength={maxFormattedLength(cardBrand)}
            {...cardNumberField}
            onChange={(event) => {
              event.target.value = formatCardNumber(event.target.value);
              void cardNumberField.onChange(event);
            }}
          />
          {errors.card?.cardNumber && <p className={styles.error}>{errors.card.cardNumber.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="card.cardHolder">Card holder</label>
          <input id="card.cardHolder" autoComplete="cc-name" {...register('card.cardHolder')} />
          {errors.card?.cardHolder && <p className={styles.error}>{errors.card.cardHolder.message}</p>}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="card.expiry">Expiry (MM/YY)</label>
            <input
              id="card.expiry"
              inputMode="numeric"
              placeholder="MM/YY"
              autoComplete="cc-exp"
              maxLength={5}
              {...expiryField}
              onChange={(event) => {
                event.target.value = formatExpiryInput(event.target.value);
                void expiryField.onChange(event);
              }}
            />
            {errors.card?.expiry && <p className={styles.error}>{errors.card.expiry.message}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="card.cvc">CVC</label>
            <input
              id="card.cvc"
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              {...cvcField}
              onChange={(event) => {
                event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
                void cvcField.onChange(event);
              }}
            />
            {errors.card?.cvc && <p className={styles.error}>{errors.card.cvc.message}</p>}
          </div>
        </div>
      </fieldset>

      {gatewayError && (
        <p className={styles.gatewayError} role="alert">
          {gatewayError}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Verifying card…' : 'Continue'}
      </button>
    </form>
  );
}
