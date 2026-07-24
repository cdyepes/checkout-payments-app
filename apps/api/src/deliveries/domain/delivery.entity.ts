export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'DELIVERED';

export interface DeliveryProps {
  id: string;
  transactionId: string;
  customerId: string;
  addressLine: string;
  city: string;
  region: string;
  country: string;
  postalCode: string | null;
  feeInCents: number;
  status: DeliveryStatus;
  assignedProductId: string | null;
  quantity: number;
}

export class Delivery {
  private constructor(private readonly props: DeliveryProps) {}

  static fromPersistence(props: DeliveryProps): Delivery {
    return new Delivery(props);
  }

  get id(): string {
    return this.props.id;
  }

  get transactionId(): string {
    return this.props.transactionId;
  }

  get status(): DeliveryStatus {
    return this.props.status;
  }

  get feeInCents(): number {
    return this.props.feeInCents;
  }
}
