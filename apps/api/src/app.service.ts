import { Injectable } from '@nestjs/common';
import { CheckoutDto } from './checkout.dto';

@Injectable()
export class AppService {
  private readonly products = [
    { id: 1, barcode: '890123456789', name: 'Pepsi 500ml', price: 120, stock: 50, category: 'Beverages' },
    { id: 2, barcode: '890123456790', name: 'Coke 500ml', price: 150, stock: 32, category: 'Beverages' },
    { id: 3, barcode: '890123456791', name: 'Lays Chips', price: 80, stock: 12, category: 'Snacks' },
  ];

  getHello(): string {
    return 'Retail POS API is running';
  }

  getProducts() {
    return this.products;
  }

  checkout(checkoutDto: CheckoutDto) {
    const subtotal = checkoutDto.items.reduce((sum, item) => {
      const product = this.products.find((entry) => entry.barcode === item.barcode);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    const discount = checkoutDto.discount ?? 0;
    const tax = subtotal * 0.17;
    const total = subtotal - discount + tax;

    return {
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: checkoutDto.customerName ?? 'Walk-in Customer',
      paymentMethod: checkoutDto.paymentMethod ?? 'Cash',
      subtotal,
      discount,
      tax,
      total,
      items: checkoutDto.items.map((item) => ({
        barcode: item.barcode,
        quantity: item.quantity,
      })),
    };
  }
}
