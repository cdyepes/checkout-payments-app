export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'GATEWAY_ERROR'
  | 'UNEXPECTED';

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code: DomainErrorCode = 'NOT_FOUND';

  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" was not found`);
  }
}

export class ValidationFailedError extends DomainError {
  readonly code: DomainErrorCode = 'VALIDATION_FAILED';

  constructor(message: string) {
    super(message);
  }
}

export class ConflictError extends DomainError {
  readonly code: DomainErrorCode = 'CONFLICT';

  constructor(message: string) {
    super(message);
  }
}

export class GatewayError extends DomainError {
  readonly code: DomainErrorCode = 'GATEWAY_ERROR';

  constructor(message: string) {
    super(message);
  }
}

export class UnexpectedError extends DomainError {
  readonly code: DomainErrorCode = 'UNEXPECTED';

  constructor(message: string) {
    super(message);
  }
}
