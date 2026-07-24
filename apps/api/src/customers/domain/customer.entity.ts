export interface CustomerProps {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  legalId: string | null;
}

export class Customer {
  private constructor(private readonly props: CustomerProps) {}

  static fromPersistence(props: CustomerProps): Customer {
    return new Customer(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get fullName(): string {
    return this.props.fullName;
  }

  get phone(): string {
    return this.props.phone;
  }

  get legalId(): string | null {
    return this.props.legalId;
  }
}
