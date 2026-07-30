export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';

/**
 * A line item of the Transaction aggregate. `unitPriceInCents` is snapshotted at
 * checkout time so a later catalogue price change never rewrites a historical order.
 * Deliberately has no `id`: the database row needs a primary key, the domain does not —
 * (transactionId, productId) is unique, so nothing ever addresses a line by surrogate id.
 */
export interface TransactionItem {
  readonly productId: string;
  readonly quantity: number;
  readonly unitPriceInCents: number;
  readonly subtotalInCents: number;
}

export interface TransactionProps {
  id: string;
  reference: string;
  status: TransactionStatus;
  customerId: string;
  items: readonly TransactionItem[];
  productAmountInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalAmountInCents: number;
  currency: string;
  providerTransactionId: string | null;
  providerStatus: string | null;
  failureReason: string | null;
}

export class Transaction {
  private constructor(private readonly props: TransactionProps) {}

  static fromPersistence(props: TransactionProps): Transaction {
    return new Transaction(props);
  }

  get id(): string {
    return this.props.id;
  }

  get reference(): string {
    return this.props.reference;
  }

  get status(): TransactionStatus {
    return this.props.status;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get items(): readonly TransactionItem[] {
    return this.props.items;
  }

  get productAmountInCents(): number {
    return this.props.productAmountInCents;
  }

  get baseFeeInCents(): number {
    return this.props.baseFeeInCents;
  }

  get deliveryFeeInCents(): number {
    return this.props.deliveryFeeInCents;
  }

  get totalAmountInCents(): number {
    return this.props.totalAmountInCents;
  }

  get currency(): string {
    return this.props.currency;
  }

  get providerTransactionId(): string | null {
    return this.props.providerTransactionId;
  }

  get providerStatus(): string | null {
    return this.props.providerStatus;
  }

  get failureReason(): string | null {
    return this.props.failureReason;
  }

  isSettled(): boolean {
    return this.props.status !== 'PENDING';
  }
}
