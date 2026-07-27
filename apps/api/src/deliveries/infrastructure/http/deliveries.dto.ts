import { DeliveryResponseSchema, GetDeliveryParamsSchema } from '@checkout/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetDeliveryParamsDto extends createZodDto(GetDeliveryParamsSchema) {}

export class DeliveryResponseDto extends createZodDto(DeliveryResponseSchema) {}
