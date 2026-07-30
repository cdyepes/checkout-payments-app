import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { DomainError, NotFoundError } from '../../shared/domain/domain-error';
import { UNIT_OF_WORK, UnitOfWork } from '../../shared/domain/unit-of-work';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepository,
} from '../../customers/domain/customer.repository.port';
import {
  DELIVERY_REPOSITORY,
  DeliveryRepository,
} from '../../deliveries/domain/delivery.repository.port';
import { Product } from '../../products/domain/product.entity';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../products/domain/product.repository.port';
import { CartLine, PricedCart, priceCart } from '../domain/cart-pricing';
import { DELIVERY_FEE_IN_CENTS } from '../domain/fees';
import { InsufficientStockError } from '../domain/insufficient-stock.error';
import { Transaction } from '../domain/transaction.entity';
import { TRANSACTION_REPOSITORY, TransactionRepository } from '../domain/transaction.repository.port';

export interface CreateCheckoutTransactionItem {
  productId: string;
  quantity: number;
}

export interface CreateCheckoutTransactionCommand {
  items: CreateCheckoutTransactionItem[];
  customer: {
    email: string;
    fullName: string;
    phone: string;
    legalId?: string;
  };
  delivery: {
    addressLine: string;
    city: string;
    region: string;
    country: string;
    postalCode?: string;
  };
}

@Injectable()
export class CreateCheckoutTransactionUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepository: ProductRepository,
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepository: CustomerRepository,
    @Inject(DELIVERY_REPOSITORY) private readonly deliveryRepository: DeliveryRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepository: TransactionRepository,
  ) {}

  execute(command: CreateCheckoutTransactionCommand): ResultAsync<Transaction, DomainError> {
    return this.unitOfWork.run(() => this.runPipeline(command));
  }

  private runPipeline(
    command: CreateCheckoutTransactionCommand,
  ): ResultAsync<Transaction, DomainError> {
    return this.productRepository
      .findManyByIds(command.items.map((item) => item.productId))
      .andThen((products) => this.priceRequestedItems(command.items, products))
      .andThen((cart) =>
        this.customerRepository
          .findOrCreateByEmail({
            email: command.customer.email,
            fullName: command.customer.fullName,
            phone: command.customer.phone,
            legalId: command.customer.legalId ?? null,
          })
          .map((customer) => ({ cart, customer })),
      )
      .andThen(({ cart, customer }) =>
        this.transactionRepository
          .create({
            reference: randomUUID(),
            status: 'PENDING',
            customerId: customer.id,
            items: cart.items,
            productAmountInCents: cart.productAmountInCents,
            baseFeeInCents: cart.baseFeeInCents,
            deliveryFeeInCents: cart.deliveryFeeInCents,
            totalAmountInCents: cart.totalAmountInCents,
            currency: 'COP',
            providerTransactionId: null,
            providerStatus: null,
            failureReason: null,
          })
          .map((transaction) => ({ transaction, customer })),
      )
      .andThen(({ transaction, customer }) =>
        this.deliveryRepository
          .create({
            transactionId: transaction.id,
            customerId: customer.id,
            addressLine: command.delivery.addressLine,
            city: command.delivery.city,
            region: command.delivery.region,
            country: command.delivery.country,
            postalCode: command.delivery.postalCode ?? null,
            feeInCents: DELIVERY_FEE_IN_CENTS,
            status: 'PENDING',
          })
          .map(() => transaction),
      );
  }

  /**
   * Resolves every requested line against the loaded products and prices the cart.
   * Walks the request in order so the first offending line is the one reported, and
   * short-circuits on the first problem to preserve the single-product error semantics:
   * an unknown productId is a NotFoundError, an unsatisfiable quantity (including a
   * non-positive one, via Product.hasStockFor) is an InsufficientStockError.
   */
  private priceRequestedItems(
    requested: readonly CreateCheckoutTransactionItem[],
    products: readonly Product[],
  ): ResultAsync<PricedCart, DomainError> {
    const productsById = new Map(products.map((product) => [product.id, product]));
    const lines: CartLine[] = [];

    for (const item of requested) {
      const product = productsById.get(item.productId);

      if (!product) {
        return errAsync(new NotFoundError('Product', item.productId));
      }
      if (!product.hasStockFor(item.quantity)) {
        return errAsync(new InsufficientStockError(product.id, item.quantity, product.stock));
      }

      lines.push({
        productId: product.id,
        quantity: item.quantity,
        unitPriceInCents: product.priceInCents,
      });
    }

    return okAsync(priceCart(lines));
  }
}
