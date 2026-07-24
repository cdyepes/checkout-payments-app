import { Product as PrismaProduct } from '@prisma/client';
import { Product } from '../../domain/product.entity';

export class ProductMapper {
  static toDomain(row: PrismaProduct): Product {
    return Product.fromPersistence({
      id: row.id,
      name: row.name,
      description: row.description,
      imageUrl: row.imageUrl,
      priceInCents: row.priceInCents,
      currency: row.currency,
      stock: row.stock,
    });
  }
}
