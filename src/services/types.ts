export enum PaySpan {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum LoopType {
  FORWARD = 'FORWARD',
  REVERSE = 'REVERSE',
}

export interface IPayDateCalculatorDTO {
  fundDate: Date;
  payDay: Date;
  holidays: Date[];
  paySpan: string;
  currentDueDay: Date;
  hasDirectDeposit: boolean;
  loopType?: LoopType;
  depth?: number;
}
