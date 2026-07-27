import { CustomerResponse } from '@checkout/contracts';
import { Customer } from '../../domain/customer.entity';

export class CustomerPresenter {
  static toResponse(customer: Customer): CustomerResponse {
    return {
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName,
      phone: customer.phone,
      legalId: customer.legalId,
    };
  }
}
