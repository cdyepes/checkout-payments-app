import {
  CreateTransactionRequestSchema,
  GetTransactionParamsSchema,
  SubmitTransactionPaymentParamsSchema,
  SubmitTransactionPaymentRequestSchema,
  TransactionResponseSchema,
} from '@checkout/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateTransactionRequestDto extends createZodDto(CreateTransactionRequestSchema) {}

export class GetTransactionParamsDto extends createZodDto(GetTransactionParamsSchema) {}

export class SubmitTransactionPaymentParamsDto extends createZodDto(
  SubmitTransactionPaymentParamsSchema,
) {}

export class SubmitTransactionPaymentRequestDto extends createZodDto(
  SubmitTransactionPaymentRequestSchema,
) {}

export class TransactionResponseDto extends createZodDto(TransactionResponseSchema) {}
