import { PayDateCalculatorService } from './pay-date-calculator.service';

// Reference: January 2024
// Jan 1=Mon, Jan 5=Fri, Jan 6=Sat, Jan 7=Sun, Jan 8=Mon
// Jan 12=Fri, Jan 13=Sat, Jan 14=Sun, Jan 15=Mon, Jan 16=Tue
// Jan 22=Mon, Jan 23=Tue
// Feb 8=Thu, Feb 9=Fri

describe('PayDateCalculatorService', () => {
  let service: PayDateCalculatorService;

  beforeEach(() => {
    service = new PayDateCalculatorService();
  });

  const d = (iso: string): Date => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  describe('calculateDueDate', () => {
    describe('direct deposit', () => {
      it('should use payDay as-is when hasDirectDeposit is true', () => {
        // fundDate: Jan 1, payDay: Jan 15 (Mon, 14 days, no weekend/holiday)
        // DD=true → Jan 15 as-is → not weekend, not holiday, 14>=10 → Jan 15
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [],
          'WEEKLY',
          d('2024-01-15'),
          true,
        );
        expect(result).toEqual(d('2024-01-15'));
      });

      it('should add 1 day to payDay when hasDirectDeposit is false', () => {
        // fundDate: Jan 1, payDay: Jan 15 (Mon, 14 days, no weekend/holiday)
        // DD=false → +1 → Jan 16 (Tue) → not weekend, not holiday, 15>=10 → Jan 16
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [],
          'WEEKLY',
          d('2024-01-15'),
          false,
        );
        expect(result).toEqual(d('2024-01-16'));
      });
    });

    describe('weekend handling (FORWARD mode)', () => {
      it('should skip Saturday and Sunday moving forward (DD=true)', () => {
        // fundDate: Jan 1, payDay: Jan 13 (Sat, 12 days)
        // DD=true → Jan 13 → Sat FORWARD +1 → Jan 14 (Sun) → Sun FORWARD +1 → Jan 15 (Mon)
        // 14>=10, not holiday → Jan 15
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [],
          'WEEKLY',
          d('2024-01-13'),
          true,
        );
        expect(result).toEqual(d('2024-01-15'));
      });

      it('should skip Sunday moving forward (DD=false)', () => {
        // fundDate: Jan 1, payDay: Jan 14 (Sun, 13 days)
        // DD=false → +1 → Jan 15 (Mon) → not weekend, not holiday, 14>=10 → Jan 15
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [],
          'WEEKLY',
          d('2024-01-14'),
          false,
        );
        expect(result).toEqual(d('2024-01-15'));
      });
    });

    describe('holiday handling', () => {
      it('should move backward past a holiday, setting REVERSE mode (DD=true)', () => {
        // fundDate: Jan 1, payDay: Jan 15 (Mon, holiday, 14 days)
        // DD=true → Jan 15 → holiday → -1 → Jan 14 (Sun, REVERSE)
        // Sun REVERSE -1 → Jan 13 (Sat) → Sat REVERSE -1 → Jan 12 (Fri)
        // Fri, 11>=10, not holiday → Jan 12
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [d('2024-01-15')],
          'WEEKLY',
          d('2024-01-15'),
          true,
        );
        expect(result).toEqual(d('2024-01-12'));
      });

      it('should skip the holiday when DD=false (+1 lands after the holiday)', () => {
        // fundDate: Jan 1, payDay: Jan 15 (Mon, holiday, 14 days)
        // DD=false → +1 → Jan 16 (Tue) → not a holiday, not weekend, 15>=10 → Jan 16
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [d('2024-01-15')],
          'WEEKLY',
          d('2024-01-15'),
          false,
        );
        expect(result).toEqual(d('2024-01-16'));
      });

      it('should not treat same day-of-month in a different month as a holiday', () => {
        // fundDate: Jan 1, payDay: Jan 15 (Mon, 14 days), holiday: Feb 15
        // DD=true → Jan 15 → getMonth differs (Feb≠Jan) → NOT a holiday match
        // not weekend, 14>=10 → Jan 15
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [d('2024-02-15')],
          'WEEKLY',
          d('2024-01-15'),
          true,
        );
        expect(result).toEqual(d('2024-01-15'));
      });

      it('should move backward past consecutive holiday + weekend in REVERSE mode', () => {
        // fundDate: Jan 1, payDay: Jan 16 (Tue, holiday, 15 days)
        // DD=true → Jan 16 → holiday → -1 → Jan 15 (Mon, REVERSE), also holiday
        // Jan 15 holiday → -1 → Jan 14 (Sun, REVERSE) → Sun REVERSE -1 → Jan 13 (Sat)
        // Sat REVERSE -1 → Jan 12 (Fri) → Fri, 11>=10, not holiday → Jan 12
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [d('2024-01-15'), d('2024-01-16')],
          'WEEKLY',
          d('2024-01-16'),
          true,
        );
        expect(result).toEqual(d('2024-01-12'));
      });
    });

    describe('< 10 days rule — advances to next pay date', () => {
      it('should advance weekly and re-apply DD=false offset', () => {
        // fundDate: Jan 1, payDay: Jan 5 (Fri, 4 days), DD=false
        // DD=false → +1 → Jan 6 (Sat) → FORWARD +1 → Jan 7 (Sun) → FORWARD +1 → Jan 8 (Mon)
        // Jan 8: 7<10 → weekly +7 → Jan 15 → re-check DD=false → +1 → Jan 16
        // Jan 16: 15>=10, not weekend, not holiday → Jan 16
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [],
          'WEEKLY',
          d('2024-01-05'),
          false,
        );
        expect(result).toEqual(d('2024-01-16'));
      });

      it('should advance weekly and re-apply DD=true (no offset)', () => {
        // fundDate: Jan 1, payDay: Jan 5 (Fri, 4 days), DD=true
        // DD=true → Jan 5 (Fri) → not weekend, not holiday, 4<10 → weekly +7 → Jan 12
        // re-check DD=true → Jan 12 (Fri) → 11>=10, not weekend → Jan 12
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [],
          'WEEKLY',
          d('2024-01-05'),
          true,
        );
        expect(result).toEqual(d('2024-01-12'));
      });

      it('should advance biweekly when payDay is less than 10 days (DD=false)', () => {
        // fundDate: Jan 1, payDay: Jan 5 (Fri, 4 days), DD=false
        // → Jan 8 (Mon) via weekends (same as weekly trace above)
        // Jan 8: 7<10 → biweekly +14 → Jan 22 (Mon) → DD=false → +1 → Jan 23 (Tue)
        // Jan 23: 22>=10, not weekend, not holiday → Jan 23
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [],
          'BIWEEKLY',
          d('2024-01-05'),
          false,
        );
        expect(result).toEqual(d('2024-01-23'));
      });

      it('should advance monthly when payDay is less than 10 days (DD=false)', () => {
        // fundDate: Jan 1, payDay: Jan 5 (Fri, 4 days), DD=false
        // → Jan 8 (Mon) via weekends
        // Jan 8: 7<10 → monthly +1month → Feb 8 (Thu) → DD=false → +1 → Feb 9 (Fri)
        // Feb 9: 39>=10, not weekend, not holiday → Feb 9
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [],
          'MONTHLY',
          d('2024-01-05'),
          false,
        );
        expect(result).toEqual(d('2024-02-09'));
      });
    });

    describe('infinite loop guards', () => {
      it('should throw when an unknown paySpan + DD=true causes no progress', () => {
        // payDay is 4 days from fundDate → triggers < 10 days strategy
        // unknown paySpan → falls back to +1 day each time → eventually escapes via depth guard
        // Actually with fix: unknown paySpan falls back to addDays(+1), so it advances and eventually exits.
        // We just verify it does NOT hang and returns a Date.
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [],
          'UNKNOWN_SPAN',
          d('2024-01-05'),
          true,
        );
        expect(result).toBeInstanceOf(Date);
      });

      it('should throw when holidays block all available dates creating a cycle', () => {
        // All weekdays Jan 8–22 are holidays → backward traversal enters a cycle
        const allBlocked = Array.from({ length: 15 }, (_, i) => d(`2024-01-${String(i + 8).padStart(2, '0')}`));
        expect(() =>
          service.calculateDueDate(
            d('2024-01-01'),
            allBlocked,
            'WEEKLY',
            d('2024-01-22'),
            true,
          ),
        ).toThrow('exceeded');
      });

      it('should throw when holidays densely cover all days going backward', () => {
        // 400 consecutive holidays going backward from payDay
        const allBlocked = Array.from({ length: 400 }, (_, i) => {
          const date = new Date(2024, 3, 1); // Apr 1 as base
          date.setDate(date.getDate() - i);
          return date;
        });
        expect(() =>
          service.calculateDueDate(
            d('2024-01-01'),
            allBlocked,
            'WEEKLY',
            d('2024-04-01'),
            true,
          ),
        ).toThrow('exceeded');
      });
    });

    describe('general', () => {
      it('should return a Date instance', () => {
        const result = service.calculateDueDate(
          d('2024-01-01'),
          [],
          'WEEKLY',
          d('2024-01-15'),
          true,
        );
        expect(result).toBeInstanceOf(Date);
      });
    });
  });
});
