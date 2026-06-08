import { addDays, addMonths, getDaysDiff } from './utils';
import { IPayDateCalculatorDTO, LoopType, PaySpan } from './types';

export class PayDateCalculatorService {
  public calculateDueDate(
    fundDate: Date,
    holidays: Date[],
    paySpan: string,
    payDay: Date,
    hasDirectDeposit: boolean,
  ): Date {
    return this.calculateAndCheckWithDeposit({
      fundDate,
      holidays,
      payDay,
      paySpan,
      hasDirectDeposit,
      loopType: LoopType.FORWARD,
    });
  }

  public calculateAndCheckWithDeposit(dto: IPayDateCalculatorDTO): Date {
    return dto.hasDirectDeposit
      ? this.calculate(dto)
      : this.calculate({
          ...dto,
          payDay: addDays(dto.payDay, 1),
        });
  }

  protected calculate(dto: IPayDateCalculatorDTO): Date {
    const dueDate = dto.payDay;
    const isDueDayHoliday = dto.holidays.find(
      (holiday) =>
        holiday.getFullYear() === dueDate.getFullYear() &&
        holiday.getMonth() === dueDate.getMonth() &&
        holiday.getDate() === dueDate.getDate(),
    );
    const isDueDateWeekend = dueDate.getDay() === 0 || dueDate.getDay() === 6;

    const strategies = [
      {
        applies: () => isDueDateWeekend,
        apply: () => {
          return this.strategyForWeekend(dto);
        },
      },
      {
        applies: () => isDueDayHoliday,
        apply: () => {
          return this.strategyForHolidays(dto);
        },
      },
      {
        applies: () => getDaysDiff(dto.fundDate, dueDate) < 10,
        apply: () => {
          return this.strategyForNextPayDay(dto);
        },
      },
    ];

    return (
      strategies.find((strategy) => strategy.applies())?.apply() || dueDate
    );
  }

  protected strategyForHolidays(dto: IPayDateCalculatorDTO): Date {
    const newPayDay = addDays(dto.payDay, -1);
    return this.calculate({
      ...dto,
      payDay: newPayDay,
      loopType: LoopType.REVERSE,
    });
  }

  protected strategyForNextPayDay = (dto: IPayDateCalculatorDTO): Date => {
    const strategies = [
      {
        applies: () => dto.paySpan === PaySpan.WEEKLY,
        apply: () => {
          return addDays(dto.payDay, 7);
        },
      },
      {
        applies: () => dto.paySpan === PaySpan.BIWEEKLY,
        apply: () => {
          return addDays(dto.payDay, 14);
        },
      },
      {
        applies: () => dto.paySpan === PaySpan.MONTHLY,
        apply: () => {
          return addMonths(dto.payDay, 1);
        },
      },
    ];
    const nextPayDay =
      strategies.find((strategy) => strategy.applies())?.apply() ?? dto.payDay;
    return this.calculateAndCheckWithDeposit({
      ...dto,
      payDay: nextPayDay,
      loopType: LoopType.FORWARD,
    });
  };

  protected strategyForWeekend = (dto: IPayDateCalculatorDTO): Date => {
    const daysToAdd = dto.loopType === LoopType.REVERSE ? -1 : 1;
    const newDueDate = addDays(dto.payDay, daysToAdd);
    return this.calculate({ ...dto, payDay: newDueDate });
  };
}
