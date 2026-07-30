import { BASE_FEE_IN_CENTS, DELIVERY_FEE_IN_CENTS } from './fees';
import { TransactionItem } from './transaction.entity';

export interface CartLine {
  productId: string;
  quantity: number;
  unitPriceInCents: number;
}

export interface PricedCart {
  items: readonly TransactionItem[];
  productAmountInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalAmountInCents: number;
}

/**
 * Prices a validated cart. Fees are flat per transaction, not per line: BASE_FEE and
 * DELIVERY_FEE are added exactly once regardless of how many products are in the cart.
 * Callers must have already resolved each line's product and checked its stock.
 */
export function priceCart(lines: readonly CartLine[]): PricedCart {
  const items: TransactionItem[] = lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    unitPriceInCents: line.unitPriceInCents,
    subtotalInCents: line.unitPriceInCents * line.quantity,
  }));

  const productAmountInCents = items.reduce((sum, item) => sum + item.subtotalInCents, 0);

  return {
    items,
    productAmountInCents,
    baseFeeInCents: BASE_FEE_IN_CENTS,
    deliveryFeeInCents: DELIVERY_FEE_IN_CENTS,
    totalAmountInCents: productAmountInCents + BASE_FEE_IN_CENTS + DELIVERY_FEE_IN_CENTS,
  };
}
