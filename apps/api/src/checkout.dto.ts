export class CheckoutDto {
  items: Array<{ barcode: string; quantity: number }>;
  customerName?: string;
  paymentMethod?: string;
  discount?: number;
}
