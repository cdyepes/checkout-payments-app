import { CustomerResponseSchema, GetCustomerParamsSchema } from '@checkout/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetCustomerParamsDto extends createZodDto(GetCustomerParamsSchema) {}

export class CustomerResponseDto extends createZodDto(CustomerResponseSchema) {}
