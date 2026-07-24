import { z } from 'zod';

export const ProductResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string().url(),
  priceInCents: z.number().int().nonnegative(),
  currency: z.literal('COP'),
  stock: z.number().int().nonnegative(),
});
export type ProductResponse = z.infer<typeof ProductResponseSchema>;

export const ListProductsResponseSchema = z.array(ProductResponseSchema);
export type ListProductsResponse = z.infer<typeof ListProductsResponseSchema>;

export const GetProductParamsSchema = z.object({
  id: z.string().uuid(),
});
export type GetProductParams = z.infer<typeof GetProductParamsSchema>;
