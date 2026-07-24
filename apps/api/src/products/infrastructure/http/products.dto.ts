import { GetProductParamsSchema, ProductResponseSchema } from '@checkout/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetProductParamsDto extends createZodDto(GetProductParamsSchema) {}

export class ProductResponseDto extends createZodDto(ProductResponseSchema) {}
