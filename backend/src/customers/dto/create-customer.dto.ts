export class CreateCustomerDto {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  notes?: string;
  creditLimit?: number;
}
