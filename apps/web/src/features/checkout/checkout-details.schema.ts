import { z } from 'zod';
import { CustomerInputSchema, DeliveryInputSchema } from '@checkout/contracts';
import { isValidCardNumber, isValidExpiry } from '@/lib/card';

// Card details never leave the browser except tokenized via the provider —
// this schema has no counterpart in @checkout/contracts on purpose.
export const CardDetailsSchema = z.object({
  cardNumber: z.string().refine(isValidCardNumber, 'Enter a valid card number'),
  cardHolder: z.string().trim().min(1, 'Card holder name is required').max(100),
  expiry: z.string().refine((value) => isValidExpiry(value), 'Enter a valid, non-expired MM/YY date'),
  cvc: z.string().regex(/^\d{3,4}$/, 'CVC must be 3 or 4 digits'),
});
export type CardDetails = z.infer<typeof CardDetailsSchema>;

// DeliveryInputSchema.postalCode is `.optional()`, which allows `undefined`
// but not an empty string — an uncontrolled text input left blank submits ''
// rather than undefined, so the form schema also accepts '' as "not provided".
const FormDeliverySchema = DeliveryInputSchema.extend({
  postalCode: z.union([z.literal(''), z.string().trim().min(1).max(20)]).optional(),
});

export const CheckoutDetailsFormSchema = z.object({
  customer: CustomerInputSchema,
  delivery: FormDeliverySchema,
  card: CardDetailsSchema,
});
export type CheckoutDetailsFormValues = z.infer<typeof CheckoutDetailsFormSchema>;
