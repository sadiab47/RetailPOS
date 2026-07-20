import { Injectable } from '@nestjs/common';
import { LoginDto, RegisterDto } from './auth.dto';
import { CreateProductDto } from './product.dto';

@Injectable()
export class AppService {
  private readonly users = [
    { id: 1, name: 'Admin User', email: 'admin@retailpos.com', password: 'admin123', role: 'admin' },
  ];

  private readonly products = [
    { id: 1, barcode: '890123456789', name: 'Pepsi 500ml', category: 'Beverages', purchasePrice: 90, sellingPrice: 120, stock: 50, sku: 'PEP-001' },
    { id: 2, barcode: '890123456790', name: 'Coke 500ml', category: 'Beverages', purchasePrice: 100, sellingPrice: 150, stock: 32, sku: 'COL-002' },
  ];

  getHello(): string {
    return 'RetailPOS backend is running';
  }

  login(loginDto: LoginDto) {
    const user = this.users.find((entry) => entry.email === loginDto.email && entry.password === loginDto.password);
    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    return {
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: `fake-jwt-${user.role}`,
    };
  }

  register(registerDto: RegisterDto) {
    const existing = this.users.find((entry) => entry.email === registerDto.email);
    if (existing) {
      return { success: false, message: 'Email already exists' };
    }

    const user = {
      id: this.users.length + 1,
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      role: registerDto.role ?? 'cashier',
    };

    this.users.push(user);

    return {
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: `fake-jwt-${user.role}`,
    };
  }

  getProducts() {
    return this.products;
  }

  createProduct(product: CreateProductDto) {
    const entry = {
      id: this.products.length + 1,
      ...product,
      sku: product.sku ?? `SKU-${this.products.length + 1}`,
    };

    this.products.push(entry);
    return entry;
  }
}
