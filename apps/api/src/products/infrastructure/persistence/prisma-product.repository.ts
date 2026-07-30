import { Injectable } from '@nestjs/common';
import { ResultAsync } from 'neverthrow';
import { DomainError, UnexpectedError } from '../../../shared/domain/domain-error';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { Product } from '../../domain/product.entity';
import { ProductRepository } from '../../domain/product.repository.port';
import { ProductMapper } from './product.mapper';

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): ResultAsync<Product[], DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().product.findMany({ orderBy: { createdAt: 'asc' } }),
      (error) => new UnexpectedError(`Failed to list products: ${(error as Error).message}`),
    ).map((rows) => rows.map(ProductMapper.toDomain));
  }

  findById(id: string): ResultAsync<Product | null, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().product.findUnique({ where: { id } }),
      (error) => new UnexpectedError(`Failed to fetch product ${id}: ${(error as Error).message}`),
    ).map((row) => (row ? ProductMapper.toDomain(row) : null));
  }

  findManyByIds(ids: readonly string[]): ResultAsync<Product[], DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().product.findMany({ where: { id: { in: [...ids] } } }),
      (error) => new UnexpectedError(`Failed to fetch products: ${(error as Error).message}`),
    ).map((rows) => rows.map(ProductMapper.toDomain));
  }

  decrementStock(id: string, quantity: number): ResultAsync<boolean, DomainError> {
    return ResultAsync.fromPromise(
      this.prisma.client().product.updateMany({
        where: { id, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      }),
      (error) =>
        new UnexpectedError(`Failed to decrement stock for product ${id}: ${(error as Error).message}`),
    ).map((result) => result.count > 0);
  }
}
