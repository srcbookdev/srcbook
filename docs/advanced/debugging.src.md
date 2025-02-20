<!-- srcbook:{"language":"typescript"} -->

# Debugging in Srcbook

This notebook demonstrates how to effectively debug TypeScript code in Srcbook notebooks, including breakpoint usage, variable inspection, and debugging strategies.

## Setup

First, let's set up some debugging utilities:

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "debug": "^4.3.4"
  }
}
```

## Breakpoint Usage

Srcbook supports debugging with breakpoints:

###### breakpoint-demo.ts

```typescript
function fibonacci(n: number): number {
  // You can set a breakpoint on the next line
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Test with a small number first
const result = fibonacci(5);
console.log('Fibonacci result:', result);

// Type assertion
type test1 = typeof result extends number ? true : false;
const assertResult: test1 = true;
```

## Variable Inspection

Inspect variables during execution:

###### variable-inspector.ts

```typescript
class DebugDemo {
  private values: number[] = [];
  
  constructor(initialValues: number[]) {
    // Set a breakpoint here to inspect initialValues
    this.values = [...initialValues];
  }
  
  addValue(value: number): void {
    // Set a breakpoint here to watch value addition
    this.values.push(value);
  }
  
  getSum(): number {
    // Set a breakpoint here to inspect the reduction
    return this.values.reduce((sum, val) => sum + val, 0);
  }
}

const demo = new DebugDemo([1, 2, 3]);
demo.addValue(4);
const sum = demo.getSum();

// Type assertions
type test2 = typeof demo extends DebugDemo ? true : false;
type test3 = typeof sum extends number ? true : false;

const assertInspectorResults: [test2, test3] = [true, true];
```

## Call Stack Navigation

Examine the call stack during debugging:

###### call-stack-demo.ts

```typescript
function level3(x: number): number {
  // Set a breakpoint here to examine the call stack
  return x * 2;
}

function level2(x: number): number {
  return level3(x + 1);
}

function level1(x: number): number {
  return level2(x * 2);
}

const stackResult = level1(5);
console.log('Stack result:', stackResult);

// Type assertion
type test4 = typeof stackResult extends number ? true : false;
const assertStackResult: test4 = true;
```

## Watch Expressions

Use watch expressions to monitor values:

###### watch-expressions.ts

```typescript
class Counter {
  private count: number = 0;
  
  increment(): void {
    // Add a watch expression for this.count
    this.count += 1;
  }
  
  decrement(): void {
    // Add a watch expression for this.count
    this.count -= 1;
  }
  
  getCount(): number {
    return this.count;
  }
}

const counter = new Counter();
counter.increment();
counter.increment();
counter.decrement();
const finalCount = counter.getCount();

// Type assertions
type test5 = typeof counter extends Counter ? true : false;
type test6 = typeof finalCount extends number ? true : false;

const assertWatchResults: [test5, test6] = [true, true];
```

## Debug Console

Interact with the debug console:

###### debug-console.ts

```typescript
import debug from 'debug';

// Configure debug namespace
const log = debug('srcbook:example');

class DebuggableClass {
  constructor(private name: string) {
    log('Created instance with name: %s', name);
  }
  
  doSomething(): void {
    log('Doing something in %s', this.name);
    // You can evaluate expressions in the debug console here
    console.log('Action completed');
  }
}

const instance = new DebuggableClass('test');
instance.doSomething();

// Type assertion
type test7 = typeof instance extends DebuggableClass ? true : false;
const assertConsoleResult: test7 = true;
```

## Conditional Breakpoints

Use conditional breakpoints for complex debugging:

###### conditional-breakpoints.ts

```typescript
function processArray(arr: number[]): number[] {
  const results: number[] = [];
  
  for (let i = 0; i < arr.length; i++) {
    // Set a conditional breakpoint here: arr[i] > 100
    const processed = arr[i] * 2;
    results.push(processed);
  }
  
  return results;
}

const input = [50, 150, 25, 200, 75];
const processed = processArray(input);

// Type assertions
type test8 = typeof processed extends number[] ? true : false;
const assertConditionResult: test8 = true;
```

## Error Handling Debug

Debug error scenarios:

###### error-debugging.ts

```typescript
class CustomError extends Error {
  constructor(message: string, public code: number) {
    super(message);
    this.name = 'CustomError';
  }
}

function mightFail(input: unknown): string {
  try {
    // Set a breakpoint here to debug error handling
    if (typeof input !== 'string') {
      throw new CustomError('Invalid input', 400);
    }
    return input.toUpperCase();
  } catch (error) {
    // Set a breakpoint here to inspect the error
    if (error instanceof CustomError) {
      console.error(`Error ${error.code}: ${error.message}`);
    }
    throw error;
  }
}

// Test successful case
const success = mightFail('hello');

// Test error case
try {
  mightFail(42);
} catch (error) {
  console.error('Caught error:', error);
}

// Type assertions
type test9 = typeof success extends string ? true : false;
type test10 = CustomError extends Error ? true : false;

const assertErrorResults: [test9, test10] = [true, true];
```

## Debugging Best Practices

1. **Strategic Breakpoint Placement**
   - Set breakpoints at critical logic points
   - Use conditional breakpoints for specific cases
   - Add breakpoints before error-prone code

2. **Effective Variable Inspection**
   - Watch critical variables
   - Examine object properties
   - Monitor state changes

3. **Console Usage**
   - Use console.log strategically
   - Leverage debug namespace
   - Format output for clarity

4. **Error Handling**
   - Break on all exceptions
   - Inspect error objects
   - Track error propagation

## Testing This Notebook

Run the tests:

```bash
npx tsx docs/testing/run-tests.ts docs/advanced/debugging.src.md
```

The test harness will:
1. Verify all type assertions
2. Execute debug scenarios
3. Validate error handling
4. Check console output

## Next Steps

- Explore [Cell Execution Context](./cell-execution.src.md)
- Learn about [Error Handling](./error-handling.src.md)
- Study [Performance Optimization](./performance.src.md)