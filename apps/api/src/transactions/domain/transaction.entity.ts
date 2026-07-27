export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';

export interface TransactionProps {
  id: string;
  reference: string;
  status: TransactionStatus;
  productId: string;
  customerId: string;
  quantity: number;
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

  get productId(): string {
    return this.props.productId;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get quantity(): number {
    return this.props.quantity;
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
