import {
  CreateTransactionRequestSchema,
  GetTransactionParamsSchema,
  TransactionResponseSchema,
} from '@checkout/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateTransactionRequestDto extends createZodDto(CreateTransactionRequestSchema) {}

export class GetTransactionParamsDto extends createZodDto(GetTransactionParamsSchema) {}

export class TransactionResponseDto extends createZodDto(TransactionResponseSchema) {}
