export class CreateProductDto {
  barcode: string;
  name: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  sku?: string;
}
