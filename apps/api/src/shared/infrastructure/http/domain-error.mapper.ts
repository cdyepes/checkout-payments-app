import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DomainError } from '../../domain/domain-error';

export function toHttpException(error: DomainError): HttpException {
  switch (error.code) {
    case 'NOT_FOUND':
      return new NotFoundException({ code: error.code, message: error.message });
    case 'VALIDATION_FAILED':
      return new BadRequestException({ code: error.code, message: error.message });
    case 'CONFLICT':
      return new ConflictException({ code: error.code, message: error.message });
    case 'GATEWAY_ERROR':
    case 'UNEXPECTED':
    default:
      return new InternalServerErrorException({ code: error.code, message: error.message });
  }
}
