# handtevy_test

This is a reusable library that provides a pay date calculation service. It can be installed and consumed in other Node.js/TypeScript projects to calculate loan due dates based on pay spans, holidays, and direct deposit settings.

## Usage in other projects

Build the library:

```bash
npm run build
```

Then install it in another project using the local path:

```bash
npm install /path/to/handtevy_test
```

Import the service in your project:

```ts
import { PayDateCalculatorService, PaySpan } from 'handtevy_test';

const service = new PayDateCalculatorService();

const dueDate = service.calculateDueDate(
  new Date(2024, 0, 1),   // fund date
  [],                      // holidays
  PaySpan.WEEKLY,          // pay span
  new Date(2024, 0, 15),  // pay day
  true,                    // has direct deposit
);
```

## Assumptions

- All `Date` objects passed to the service must be constructed as **local midnight dates** using `new Date(year, month - 1, day)`. Dates created from ISO strings (e.g. `new Date('2024-01-15')`) are parsed as UTC midnight and will produce incorrect results in non-UTC timezones, since the service relies on local-time methods (`getDay()`, `getDate()`, `setDate()`).

## Requirements

- Node.js >= 18
- npm >= 9

## Setup

Install dependencies:

```bash
npm install
```

## Running the project

**Development** (runs with `ts-node`, no build needed):

```bash
npm run dev
```

**Production** (compile then run):

```bash
npm run build
npm start
```

## Running the tests

Run all tests once:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Code formatting

Format all source files:

```bash
npm run format
```

Check formatting without writing:

```bash
npm run format:check
```
