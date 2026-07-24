import { z } from 'zod';

export const ApiErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  code: z.string(),
  message: z.string(),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
