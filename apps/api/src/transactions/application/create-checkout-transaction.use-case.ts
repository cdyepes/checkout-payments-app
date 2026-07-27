import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { errAsync, okAsync, Result, ResultAsync } from 'neverthrow';
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
import { PRODUCT_REPOSITORY, ProductRepository } from '../../products/domain/product.repository.port';
import { BASE_FEE_IN_CENTS, DELIVERY_FEE_IN_CENTS } from '../domain/fees';
import { InsufficientStockError } from '../domain/insufficient-stock.error';
import { Transaction } from '../domain/transaction.entity';
import { TRANSACTION_REPOSITORY, TransactionRepository } from '../domain/transaction.repository.port';

export interface CreateCheckoutTransactionCommand {
  productId: string;
  quantity: number;
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
    return new ResultAsync(
      this.unitOfWork.run(async (): Promise<Result<Transaction, DomainError>> => {
        return this.runPipeline(command);
      }),
    );
  }

  private runPipeline(
    command: CreateCheckoutTransactionCommand,
  ): ResultAsync<Transaction, DomainError> {
    return this.productRepository
      .findById(command.productId)
      .andThen((product) =>
        product ? okAsync(product) : errAsync(new NotFoundError('Product', command.productId)),
      )
      .andThen((product) =>
        product.hasStockFor(command.quantity)
          ? okAsync(product)
          : errAsync(new InsufficientStockError(product.id, command.quantity, product.stock)),
      )
      .andThen((product) =>
        this.customerRepository
          .findOrCreateByEmail({
            email: command.customer.email,
            fullName: command.customer.fullName,
            phone: command.customer.phone,
            legalId: command.customer.legalId ?? null,
          })
          .map((customer) => ({ product, customer })),
      )
      .andThen(({ product, customer }) => {
        const productAmountInCents = product.priceInCents * command.quantity;
        const totalAmountInCents = productAmountInCents + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS;

        return this.transactionRepository
          .create({
            reference: randomUUID(),
            status: 'PENDING',
            productId: product.id,
            customerId: customer.id,
            quantity: command.quantity,
            productAmountInCents,
            baseFeeInCents: BASE_FEE_IN_CENTS,
            deliveryFeeInCents: DELIVERY_FEE_IN_CENTS,
            totalAmountInCents,
            currency: 'COP',
            providerTransactionId: null,
            providerStatus: null,
            failureReason: null,
          })
          .map((transaction) => ({ transaction, customer }));
      })
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
            assignedProductId: null,
            quantity: command.quantity,
          })
          .map(() => transaction),
      );
  }
}
