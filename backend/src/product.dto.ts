export class CreateProductDto {
  barcode: string;
  name: string;
  categoryId?: number;
  supplierId?: number;
  costPrice: number;
  sellingPrice: number;
  stock?: number;
  lowStockThreshold?: number;
  sku?: string;
  isActive?: boolean;
}
