export interface ProductProps {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  priceInCents: number;
  currency: string;
  stock: number;
}

export class Product {
  private constructor(private readonly props: ProductProps) {}

  static fromPersistence(props: ProductProps): Product {
    return new Product(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get imageUrl(): string {
    return this.props.imageUrl;
  }

  get priceInCents(): number {
    return this.props.priceInCents;
  }

  get currency(): string {
    return this.props.currency;
  }

  get stock(): number {
    return this.props.stock;
  }

  hasStockFor(quantity: number): boolean {
    return quantity > 0 && this.stock >= quantity;
  }
}
