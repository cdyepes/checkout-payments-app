import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeliveryResponse } from '@checkout/contracts';
import { GetDeliveryUseCase } from '../../application/get-delivery.use-case';
import { toHttpException } from '../../../shared/infrastructure/http/domain-error.mapper';
import { GetDeliveryParamsDto, DeliveryResponseDto } from './deliveries.dto';
import { DeliveryPresenter } from './delivery.presenter';

@ApiTags('deliveries')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly getDelivery: GetDeliveryUseCase) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a single delivery by id' })
  @ApiOkResponse({ type: DeliveryResponseDto })
  async getById(@Param() params: GetDeliveryParamsDto): Promise<DeliveryResponse> {
    const result = await this.getDelivery.execute({ id: params.id });
    return result.match(DeliveryPresenter.toResponse, (error) => {
      throw toHttpException(error);
    });
  }
}
