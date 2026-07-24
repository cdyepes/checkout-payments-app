import {
  ConflictError,
  GatewayError,
  NotFoundError,
  UnexpectedError,
  ValidationFailedError,
} from './domain-error';

describe('DomainError subclasses', () => {
  it('NotFoundError carries the entity, id and NOT_FOUND code', () => {
    const error = new NotFoundError('Product', 'abc');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Product with id "abc" was not found');
    expect(error.name).toBe('NotFoundError');
  });

  it('ValidationFailedError carries VALIDATION_FAILED', () => {
    const error = new ValidationFailedError('bad input');
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.message).toBe('bad input');
  });

  it('ConflictError carries CONFLICT', () => {
    const error = new ConflictError('duplicate');
    expect(error.code).toBe('CONFLICT');
  });

  it('GatewayError carries GATEWAY_ERROR', () => {
    const error = new GatewayError('provider down');
    expect(error.code).toBe('GATEWAY_ERROR');
  });

  it('UnexpectedError carries UNEXPECTED', () => {
    const error = new UnexpectedError('boom');
    expect(error.code).toBe('UNEXPECTED');
  });
});
