export class CreateSaleItemDto {
  productId: number;
  quantity: number;
}

export class CreateSaleDto {
  customerId?: number;
  customerName?: string;
  paymentMethod: string;
  discount?: number; // Flat discount amount
  tax?: number; // Flat tax amount
  items: CreateSaleItemDto[];
}
