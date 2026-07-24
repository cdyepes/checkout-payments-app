import { z } from 'zod';

export const CustomerInputSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(7).max(20),
  legalId: z.string().trim().min(1).max(50).optional(),
});
export type CustomerInput = z.infer<typeof CustomerInputSchema>;

export const CustomerResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  phone: z.string(),
  legalId: z.string().nullable(),
});
export type CustomerResponse = z.infer<typeof CustomerResponseSchema>;

export const GetCustomerParamsSchema = z.object({
  id: z.string().uuid(),
});
export type GetCustomerParams = z.infer<typeof GetCustomerParamsSchema>;
