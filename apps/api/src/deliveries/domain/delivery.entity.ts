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

  get customerId(): string {
    return this.props.customerId;
  }

  get addressLine(): string {
    return this.props.addressLine;
  }

  get city(): string {
    return this.props.city;
  }

  get region(): string {
    return this.props.region;
  }

  get country(): string {
    return this.props.country;
  }

  get postalCode(): string | null {
    return this.props.postalCode;
  }

  get status(): DeliveryStatus {
    return this.props.status;
  }

  get feeInCents(): number {
    return this.props.feeInCents;
  }

  get assignedProductId(): string | null {
    return this.props.assignedProductId;
  }

  get quantity(): number {
    return this.props.quantity;
  }
}
