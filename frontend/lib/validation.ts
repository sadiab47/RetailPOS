import { z } from 'zod';

export const productSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  name: z.string().min(1, 'Product name is required'),
  categoryId: z.number().nullable().optional(),
  supplierId: z.number().nullable().optional(),
  costPrice: z.number().nonnegative('Cost price cannot be negative'),
  sellingPrice: z.number().nonnegative('Selling price cannot be negative'),
  stock: z.number().int().nonnegative('Stock cannot be negative').optional().default(0),
  lowStockThreshold: z.number().int().nonnegative('Threshold cannot be negative').optional().default(10),
  sku: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

export const supplierSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email('Invalid email address'), z.literal('')]).optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const adjustmentSchema = z.object({
  productId: z.number().min(1, 'Product is required'),
  transactionType: z.string().min(1, 'Transaction type is required'),
  quantityChange: z.number().int().refine(v => v !== 0, 'Change cannot be zero'),
  remarks: z.string().optional(),
});

export const purchaseOrderItemSchema = z.object({
  productId: z.number().min(1, 'Product is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitCost: z.number().positive('Unit cost must be positive'),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.number().min(1, 'Supplier is required'),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
});

export const customerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  phone: z.string().min(5, 'Phone number must be at least 5 digits'),
  email: z.union([z.string().email('Invalid email address'), z.literal('')]).optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  notes: z.string().optional(),
  creditLimit: z.number().nonnegative('Credit limit cannot be negative').optional().default(0),
});
