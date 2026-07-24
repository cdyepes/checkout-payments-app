import { ProductResponse } from '@checkout/contracts';
import { Product } from '../../domain/product.entity';

export class ProductPresenter {
  static toResponse(product: Product): ProductResponse {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      priceInCents: product.priceInCents,
      currency: product.currency as 'COP',
      stock: product.stock,
    };
  }
}
