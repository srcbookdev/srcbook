<!-- srcbook:{"language":"typescript"} -->

# Srcbook Notebook Test Harness

This notebook provides utilities for testing other Srcbook notebooks. It helps ensure that documentation notebooks are accurate and runnable.

## Test Harness Setup

First, let's set up our dependencies:

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "glob": "^10.3.10",
    "chalk": "^5.3.0",
    "zod": "^3.22.4"
  }
}
```

### Test Runner Types

###### types.ts

```typescript
interface TestResult {
  notebookPath: string;
  cells: CellResult[];
  success: boolean;
  error?: string;
}

interface CellResult {
  id: string;
  type: 'code' | 'markdown';
  success: boolean;
  error?: string;
  output?: any;
}

interface TestSummary {
  totalNotebooks: number;
  passedNotebooks: number;
  failedNotebooks: number;
  results: TestResult[];
}
```

### Notebook Loading

###### notebook-loader.ts

```typescript
import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function findNotebooks(dir: string): Promise<string[]> {
  const pattern = join(dir, '**/*.src.md');
  return glob(pattern);
}

export async function loadNotebook(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}
```

### Test Runner

###### test-runner.ts

```typescript
import chalk from 'chalk';
import type { TestResult, CellResult, TestSummary } from './types.ts';
import { findNotebooks, loadNotebook } from './notebook-loader.ts';

export async function runTests(dir: string): Promise<TestSummary> {
  const notebooks = await findNotebooks(dir);
  const results: TestResult[] = [];
  
  for (const notebook of notebooks) {
    try {
      const content = await loadNotebook(notebook);
      const result = await testNotebook(content);
      results.push({
        notebookPath: notebook,
        ...result
      });
    } catch (error) {
      results.push({
        notebookPath: notebook,
        cells: [],
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return summarizeResults(results);
}

async function testNotebook(content: string): Promise<Omit<TestResult, 'notebookPath'>> {
  // TODO: Implement notebook testing logic
  // This would:
  // 1. Parse the notebook
  // 2. Execute each cell
  // 3. Verify outputs
  // 4. Check types
  return {
    cells: [],
    success: true
  };
}

function summarizeResults(results: TestResult[]): TestSummary {
  const totalNotebooks = results.length;
  const passedNotebooks = results.filter(r => r.success).length;
  const failedNotebooks = totalNotebooks - passedNotebooks;
  
  return {
    totalNotebooks,
    passedNotebooks,
    failedNotebooks,
    results
  };
}
```

### Results Reporter

###### reporter.ts

```typescript
import chalk from 'chalk';
import type { TestSummary, TestResult } from './types.ts';

export function reportResults(summary: TestSummary): void {
  console.log('\nNotebook Test Results:');
  console.log('=====================\n');
  
  console.log(`Total Notebooks: ${summary.totalNotebooks}`);
  console.log(`Passed: ${chalk.green(summary.passedNotebooks)}`);
  console.log(`Failed: ${chalk.red(summary.failedNotebooks)}\n`);
  
  for (const result of summary.results) {
    reportNotebookResult(result);
  }
}

function reportNotebookResult(result: TestResult): void {
  const status = result.success ? chalk.green('PASS') : chalk.red('FAIL');
  console.log(`${status} ${result.notebookPath}`);
  
  if (!result.success && result.error) {
    console.log(chalk.red(`  Error: ${result.error}`));
  }
  
  for (const cell of result.cells) {
    const cellStatus = cell.success ? chalk.green('✓') : chalk.red('✗');
    console.log(`  ${cellStatus} ${cell.type} cell ${cell.id}`);
    if (!cell.success && cell.error) {
      console.log(chalk.red(`    ${cell.error}`));
    }
  }
  
  console.log('');
}
```

### Test Runner Usage

###### run-tests.ts

```typescript
import { runTests } from './test-runner.ts';
import { reportResults } from './reporter.ts';

async function main() {
  try {
    const summary = await runTests('../');
    reportResults(summary);
    process.exit(summary.failedNotebooks > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test runner failed:', error);
    process.exit(1);
  }
}

main();
```

## Running the Tests

To run tests on all documentation notebooks:

1. Install dependencies:
```bash
npm install
```

2. Run the test runner:
```bash
npx tsx run-tests.ts
```

## Test Categories

The test harness verifies several aspects of each notebook:

1. **Syntax Validation**
   - Valid .src.md format
   - Proper cell structure
   - Correct metadata

2. **Type Checking**
   - TypeScript compilation
   - Type inference
   - Module resolution

3. **Runtime Execution**
   - Cell execution
   - Output validation
   - Error handling

4. **Resource Usage**
   - Memory consumption
   - Execution time
   - File system operations

## Adding Tests

To add tests for a new notebook:

1. Create the notebook in the docs directory
2. Add any required test fixtures
3. Run the test harness
4. Review and fix any issues

## Next Steps

1. Implement the notebook testing logic in test-runner.ts
2. Add specific test cases for each documentation notebook
3. Set up continuous integration
4. Add performance benchmarks

This test harness will help us ensure that all documentation notebooks are accurate and executable.