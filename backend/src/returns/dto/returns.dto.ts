export class CreateReturnItemDto {
  saleItemId: number;
  productId: number;
  quantity: number;
}

export class CreateReturnDto {
  saleId: number;
  reasonCode: 'DAMAGED' | 'WRONG_ITEM' | 'CUSTOMER_CHANGED_MIND' | 'EXPIRED' | 'DEFECTIVE' | 'OTHER';
  reasonNotes?: string;
  refundMethod: 'CASH' | 'STORE_CREDIT' | 'ORIGINAL_PAYMENT';
  items: CreateReturnItemDto[];
}
