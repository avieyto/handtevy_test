import { addDays, getDaysDiff } from './utils';

export class PayDateCalculatorService {
  public calculateDueDate(
    fundDate: Date,
    holidays: Date[],
    paySpan: string,
    payDay: Date,
    hasDirectDeposit: boolean,
  ): Date {
    const dueDate = payDay;
    const isDueDayHoliday = holidays.find((holiday) => holiday.getDate() === dueDate.getDate());
    const isDueDateWeekend = dueDate.getDay() === 0 || dueDate.getDay() === 6;

    const strategies = [
      {
        applies: () => getDaysDiff(fundDate, dueDate) < 10,
        apply: () => {
          
          return this.calculateDueDate(
            fundDate,
            holidays,
            paySpan,
            addDays(dueDate, 10),
            hasDirectDeposit,
          );
        },
      },
      {
        applies: () => isDueDateWeekend,
        apply: () => {
          const daysToAdd = dueDate.getDay() === 0 ? 1 : 2;
          return this.calculateDueDate(
            fundDate,
            holidays,
            paySpan,
            addDays(dueDate, daysToAdd),
            hasDirectDeposit,
          );
        },
      },
      {
        applies: () => isDueDayHoliday,
        apply: () => {
          return this.calculateDueDate(
            fundDate,
            holidays,
            paySpan,
            addDays(dueDate, -1),
            hasDirectDeposit,
          );
        },
      },
    ];

    return strategies.find((strategy) => strategy.applies())?.apply() || dueDate;
  }
}
