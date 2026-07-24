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

  get totalAmountInCents(): number {
    return this.props.totalAmountInCents;
  }

  isSettled(): boolean {
    return this.props.status !== 'PENDING';
  }
}
