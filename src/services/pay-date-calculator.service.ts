import { addDays, addMonths, getDaysDiff } from './utils';
import { IPayDateCalculatorDTO, LoopType, PaySpan } from './types';

const MAX_ITERATIONS = 365;

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
      dueDay: this.findClosestPayDateAfterFundDay(fundDate, payDay, paySpan),
      paySpan,
      hasDirectDeposit,
      loopType: LoopType.FORWARD,
      depth: 0,
    });
  }

  protected findClosestPayDateAfterFundDay(
    fundDate: Date,
    payDay: Date,
    paySpan: string,
  ): Date {
    let current = payDay;

    while (getDaysDiff(fundDate, current) > 0) {
      current =
        paySpan === PaySpan.MONTHLY
          ? addMonths(current, -1)
          : addDays(current, paySpan === PaySpan.BIWEEKLY ? -14 : -7);
    }

    while (getDaysDiff(fundDate, current) <= 0) {
      current =
        paySpan === PaySpan.MONTHLY
          ? addMonths(current, 1)
          : addDays(current, paySpan === PaySpan.BIWEEKLY ? 14 : 7);
    }

    return current;
  }

  protected calculateAndCheckWithDeposit(dto: IPayDateCalculatorDTO): Date {
    return dto.hasDirectDeposit
      ? this.calculate(dto)
      : this.calculate({
          ...dto,
          dueDay: addDays(dto.dueDay, 1),
        });
  }

  protected calculate(dto: IPayDateCalculatorDTO): Date {
    const depth = (dto.depth ?? 0) + 1;
    if (depth > MAX_ITERATIONS) {
      throw new Error(
        `Pay date calculation exceeded ${MAX_ITERATIONS} iterations. ` +
          'Verify that paySpan is a valid value and that holidays do not block all available dates.',
      );
    }
    dto = { ...dto, depth };

    const dueDate = dto.dueDay;
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
    const newPayDay = addDays(dto.dueDay, -1);
    return this.calculate({
      ...dto,
      dueDay: newPayDay,
      loopType: LoopType.REVERSE,
    });
  }

  protected strategyForNextPayDay(dto: IPayDateCalculatorDTO): Date {
    const strategies = [
      {
        applies: () => dto.paySpan === PaySpan.WEEKLY,
        apply: () => {
          return addDays(dto.dueDay, 7);
        },
      },
      {
        applies: () => dto.paySpan === PaySpan.BIWEEKLY,
        apply: () => {
          return addDays(dto.dueDay, 14);
        },
      },
      {
        applies: () => dto.paySpan === PaySpan.MONTHLY,
        apply: () => {
          return addMonths(dto.dueDay, 1);
        },
      },
    ];
    const nextPayDay =
      strategies.find((strategy) => strategy.applies())?.apply() ??
      addDays(dto.dueDay, 1);
    return this.calculateAndCheckWithDeposit({
      ...dto,
      dueDay: nextPayDay,
      loopType: LoopType.FORWARD,
    });
  }

  protected strategyForWeekend(dto: IPayDateCalculatorDTO): Date {
    const daysToAdd = dto.loopType === LoopType.REVERSE ? -1 : 1;
    const newDueDate = addDays(dto.dueDay, daysToAdd);
    return this.calculate({ ...dto, dueDay: newDueDate });
  }
}
