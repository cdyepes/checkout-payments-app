import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  ConflictError,
  GatewayError,
  NotFoundError,
  UnexpectedError,
  ValidationFailedError,
} from '../../domain/domain-error';
import { toHttpException } from './domain-error.mapper';

describe('toHttpException', () => {
  it('maps NotFoundError to a 404', () => {
    expect(toHttpException(new NotFoundError('Product', '1'))).toBeInstanceOf(NotFoundException);
  });

  it('maps ValidationFailedError to a 400', () => {
    expect(toHttpException(new ValidationFailedError('bad input'))).toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps ConflictError to a 409', () => {
    expect(toHttpException(new ConflictError('already exists'))).toBeInstanceOf(ConflictException);
  });

  it('maps GatewayError to a 500', () => {
    expect(toHttpException(new GatewayError('provider down'))).toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('maps UnexpectedError to a 500', () => {
    expect(toHttpException(new UnexpectedError('boom'))).toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
