import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerResponse } from '@checkout/contracts';
import { GetCustomerUseCase } from '../../application/get-customer.use-case';
import { toHttpException } from '../../../shared/infrastructure/http/domain-error.mapper';
import { GetCustomerParamsDto, CustomerResponseDto } from './customers.dto';
import { CustomerPresenter } from './customer.presenter';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly getCustomer: GetCustomerUseCase) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a single customer by id' })
  @ApiOkResponse({ type: CustomerResponseDto })
  async getById(@Param() params: GetCustomerParamsDto): Promise<CustomerResponse> {
    const result = await this.getCustomer.execute({ id: params.id });
    return result.match(CustomerPresenter.toResponse, (error) => {
      throw toHttpException(error);
    });
  }
}
