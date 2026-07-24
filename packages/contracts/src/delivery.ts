import { z } from 'zod';

export const DeliveryInputSchema = z.object({
  addressLine: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().min(1).max(100),
  country: z.string().trim().length(2),
  postalCode: z.string().trim().min(1).max(20).optional(),
});
export type DeliveryInput = z.infer<typeof DeliveryInputSchema>;

export const DeliveryStatusSchema = z.enum(['PENDING', 'ASSIGNED', 'DELIVERED']);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

export const DeliveryResponseSchema = z.object({
  id: z.string().uuid(),
  transactionId: z.string().uuid(),
  addressLine: z.string(),
  city: z.string(),
  region: z.string(),
  country: z.string(),
  postalCode: z.string().nullable(),
  feeInCents: z.number().int().nonnegative(),
  status: DeliveryStatusSchema,
  quantity: z.number().int().positive(),
});
export type DeliveryResponse = z.infer<typeof DeliveryResponseSchema>;

export const GetDeliveryParamsSchema = z.object({
  id: z.string().uuid(),
});
export type GetDeliveryParams = z.infer<typeof GetDeliveryParamsSchema>;
