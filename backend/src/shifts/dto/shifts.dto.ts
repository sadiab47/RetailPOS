export class OpenShiftDto {
  registerId: number;
  openingCash: number;
}

export class CloseShiftDto {
  actualCash: number;
  notes?: string;
}

export class CashMovementDto {
  amount: number;
  type: 'CASH_IN' | 'CASH_OUT' | 'SAFE_DROP' | 'BANK_DEPOSIT' | 'ADJUSTMENT';
  remarks?: string;
}
