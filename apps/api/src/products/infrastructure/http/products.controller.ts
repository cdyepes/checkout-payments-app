import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductResponse } from '@checkout/contracts';
import { GetProductUseCase } from '../../application/get-product.use-case';
import { ListProductsUseCase } from '../../application/list-products.use-case';
import { toHttpException } from '../../../shared/infrastructure/http/domain-error.mapper';
import { GetProductParamsDto, ProductResponseDto } from './products.dto';
import { ProductPresenter } from './product.presenter';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly listProducts: ListProductsUseCase,
    private readonly getProduct: GetProductUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all products with current stock' })
  @ApiOkResponse({ type: ProductResponseDto, isArray: true })
  async list(): Promise<ProductResponse[]> {
    const result = await this.listProducts.execute();
    return result.match(
      (products) => products.map(ProductPresenter.toResponse),
      (error) => {
        throw toHttpException(error);
      },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single product by id' })
  @ApiOkResponse({ type: ProductResponseDto })
  async getById(@Param() params: GetProductParamsDto): Promise<ProductResponse> {
    const result = await this.getProduct.execute({ id: params.id });
    return result.match(ProductPresenter.toResponse, (error) => {
      throw toHttpException(error);
    });
  }
}
