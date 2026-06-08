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
  holidays: Date[];
  paySpan: string;
  payDay: Date;
  hasDirectDeposit: boolean;
  loopType?: LoopType;
}
