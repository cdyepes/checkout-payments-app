import { Module } from '@nestjs/common';
import { GetProductUseCase } from './application/get-product.use-case';
import { ListProductsUseCase } from './application/list-products.use-case';
import { PRODUCT_REPOSITORY } from './domain/product.repository.port';
import { ProductsController } from './infrastructure/http/products.controller';
import { PrismaProductRepository } from './infrastructure/persistence/prisma-product.repository';

@Module({
  controllers: [ProductsController],
  providers: [
    ListProductsUseCase,
    GetProductUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
  ],
})
export class ProductsModule {}
