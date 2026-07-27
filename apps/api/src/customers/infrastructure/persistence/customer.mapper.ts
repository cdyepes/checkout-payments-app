import { Customer as PrismaCustomer } from '@prisma/client';
import { Customer } from '../../domain/customer.entity';

export class CustomerMapper {
  static toDomain(row: PrismaCustomer): Customer {
    return Customer.fromPersistence({
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      phone: row.phone,
      legalId: row.legalId,
    });
  }
}
