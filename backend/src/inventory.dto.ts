export class CreateCategoryDto {
  name: string;
  description?: string;
}

export class CreateSupplierDto {
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export class UpdateProductDto {
  barcode?: string;
  name?: string;
  categoryId?: number;
  supplierId?: number;
  costPrice?: number;
  sellingPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  sku?: string;
  isActive?: boolean;
}

export class AdjustStockDto {
  productId: number;
  transactionType: string; // e.g. DAMAGE, ADJUSTMENT, RETURN, etc.
  quantityChange: number; // Positive to add, negative to subtract
  remarks?: string;
}

export class PurchaseOrderItemDto {
  productId: number;
  quantity: number;
  unitCost: number;
}

export class CreatePurchaseOrderDto {
  supplierId: number;
  items: PurchaseOrderItemDto[];
}
