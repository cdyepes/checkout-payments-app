import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionResponse } from '@checkout/contracts';
import { CreateCheckoutTransactionUseCase } from '../../application/create-checkout-transaction.use-case';
import { GetTransactionUseCase } from '../../application/get-transaction.use-case';
import { toHttpException } from '../../../shared/infrastructure/http/domain-error.mapper';
import {
  CreateTransactionRequestDto,
  GetTransactionParamsDto,
  TransactionResponseDto,
} from './transactions.dto';
import { TransactionPresenter } from './transaction.presenter';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createCheckoutTransaction: CreateCheckoutTransactionUseCase,
    private readonly getTransaction: GetTransactionUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a PENDING checkout transaction' })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  async create(@Body() body: CreateTransactionRequestDto): Promise<TransactionResponse> {
    const result = await this.createCheckoutTransaction.execute(body);
    return result.match(TransactionPresenter.toResponse, (error) => {
      throw toHttpException(error);
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single transaction by id' })
  @ApiOkResponse({ type: TransactionResponseDto })
  async getById(@Param() params: GetTransactionParamsDto): Promise<TransactionResponse> {
    const result = await this.getTransaction.execute({ id: params.id });
    return result.match(TransactionPresenter.toResponse, (error) => {
      throw toHttpException(error);
    });
  }
}
