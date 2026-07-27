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

export const CreateTransactionRequestSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  customer: CustomerInputSchema,
  delivery: DeliveryInputSchema,
});
export type CreateTransactionRequest = z.infer<typeof CreateTransactionRequestSchema>;

export const TransactionResponseSchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  status: TransactionStatusSchema,
  productId: z.string().uuid(),
  customerId: z.string().uuid(),
  quantity: z.number().int().positive(),
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
