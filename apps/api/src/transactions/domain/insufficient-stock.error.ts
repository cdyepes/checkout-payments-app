import { DomainError, DomainErrorCode } from '../../shared/domain/domain-error';

export class InsufficientStockError extends DomainError {
  readonly code: DomainErrorCode = 'CONFLICT';

  constructor(
    public readonly productId: string,
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(
      `Product "${productId}" has ${available} unit(s) available, but ${requested} were requested`,
    );
  }
}
