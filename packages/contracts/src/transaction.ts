import { z } from 'zod';
import { CustomerInputSchema } from './customer';
import { DeliveryInputSchema } from './delivery';

export const TransactionStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'DECLINED',
  'ERROR',
  'VOIDED',
]);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

export const TransactionItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(100),
});
export type TransactionItemInput = z.infer<typeof TransactionItemInputSchema>;

export const CreateTransactionRequestSchema = z.object({
  items: z
    .array(TransactionItemInputSchema)
    .min(1, 'A checkout must contain at least one item')
    .max(20, 'A checkout cannot contain more than 20 distinct products')
    // One line per product: line items are stored under a unique (transactionId,
    // productId) key, so a repeated product is a client bug, not something to
    // silently merge — merging would also break request/response symmetry.
    .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, {
      message: 'Each product may appear at most once; combine duplicates into a single item',
    }),
  customer: CustomerInputSchema,
  delivery: DeliveryInputSchema,
});
export type CreateTransactionRequest = z.infer<typeof CreateTransactionRequestSchema>;

export const TransactionItemResponseSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  // Snapshotted at checkout time — may differ from the product's current price.
  unitPriceInCents: z.number().int().nonnegative(),
  subtotalInCents: z.number().int().nonnegative(),
});
export type TransactionItemResponse = z.infer<typeof TransactionItemResponseSchema>;

export const TransactionResponseSchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  status: TransactionStatusSchema,
  customerId: z.string().uuid(),
  items: z.array(TransactionItemResponseSchema),
  // Sum of items[].subtotalInCents; fees below are flat per transaction, not per item.
  productAmountInCents: z.number().int().nonnegative(),
  baseFeeInCents: z.number().int().nonnegative(),
  deliveryFeeInCents: z.number().int().nonnegative(),
  totalAmountInCents: z.number().int().nonnegative(),
  currency: z.literal('COP'),
  providerTransactionId: z.string().nullable(),
  providerStatus: z.string().nullable(),
  failureReason: z.string().nullable(),
});
export type TransactionResponse = z.infer<typeof TransactionResponseSchema>;

export const GetTransactionParamsSchema = z.object({
  id: z.string().uuid(),
});
export type GetTransactionParams = z.infer<typeof GetTransactionParamsSchema>;

export const SubmitTransactionPaymentParamsSchema = z.object({
  id: z.string().uuid(),
});
export type SubmitTransactionPaymentParams = z.infer<typeof SubmitTransactionPaymentParamsSchema>;

export const SubmitTransactionPaymentRequestSchema = z.object({
  cardToken: z.string().min(1),
});
export type SubmitTransactionPaymentRequest = z.infer<typeof SubmitTransactionPaymentRequestSchema>;
