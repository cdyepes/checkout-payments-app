import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionResponse } from '@checkout/contracts';
import { CreateCheckoutTransactionUseCase } from '../../application/create-checkout-transaction.use-case';
import { ReconcileTransactionUseCase } from '../../application/reconcile-transaction.use-case';
import { SubmitTransactionPaymentUseCase } from '../../application/submit-transaction-payment.use-case';
import { toHttpException } from '../../../shared/infrastructure/http/domain-error.mapper';
import {
  CreateTransactionRequestDto,
  GetTransactionParamsDto,
  SubmitTransactionPaymentParamsDto,
  SubmitTransactionPaymentRequestDto,
  TransactionResponseDto,
} from './transactions.dto';
import { TransactionPresenter } from './transaction.presenter';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createCheckoutTransaction: CreateCheckoutTransactionUseCase,
    private readonly submitTransactionPayment: SubmitTransactionPaymentUseCase,
    private readonly reconcileTransaction: ReconcileTransactionUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Create a PENDING checkout transaction' })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  async create(@Body() body: CreateTransactionRequestDto): Promise<TransactionResponse> {
    const result = await this.createCheckoutTransaction.execute(body);
    return result.match(TransactionPresenter.toResponse, (error) => {
      throw toHttpException(error);
    });
  }

  @Post(':id/payment')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Submit a card token to charge a PENDING transaction' })
  @ApiOkResponse({ type: TransactionResponseDto })
  async submitPayment(
    @Param() params: SubmitTransactionPaymentParamsDto,
    @Body() body: SubmitTransactionPaymentRequestDto,
  ): Promise<TransactionResponse> {
    const result = await this.submitTransactionPayment.execute({
      transactionId: params.id,
      cardToken: body.cardToken,
    });
    return result.match(TransactionPresenter.toResponse, (error) => {
      throw toHttpException(error);
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction, reconciling its status with the gateway if still PENDING' })
  @ApiOkResponse({ type: TransactionResponseDto })
  async getById(@Param() params: GetTransactionParamsDto): Promise<TransactionResponse> {
    const result = await this.reconcileTransaction.execute({ transactionId: params.id });
    return result.match(TransactionPresenter.toResponse, (error) => {
      throw toHttpException(error);
    });
  }
}
