<!-- srcbook:{"language":"typescript"} -->

# Cell Execution Context in Srcbook

This notebook explains how cell execution works in Srcbook, including scope isolation, variable persistence, and module caching.

## Setup

First, let's set up our environment:

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "uuid": "^9.0.1"
  }
}
```

## Scope Isolation

Each cell has its own scope:

###### scope-a.ts

```typescript
// This variable is scoped to this cell
const localVar = "I'm local to scope-a";

// Export to make it available to other cells
export const sharedVar = "I'm shared from scope-a";

// Type assertion
type test1 = typeof localVar extends string ? true : false;
const assertScopeA: test1 = true;
```

###### scope-b.ts

```typescript
// This will error - localVar is not accessible
// console.log(localVar);

// But we can access sharedVar
import { sharedVar } from './scope-a.ts';
console.log('Shared var:', sharedVar);

// Create our own local var
const localVar = "I'm local to scope-b";

// Type assertions
type test2 = typeof sharedVar extends string ? true : false;
type test3 = typeof localVar extends string ? true : false;

const assertScopeB: [test2, test3] = [true, true];
```

## Variable Persistence

Variables persist within their cell's scope:

###### counter.ts

```typescript
let count = 0;

export function increment(): number {
  return ++count;
}

export function getCount(): number {
  return count;
}

// Type assertions
type test4 = typeof increment extends () => number ? true : false;
type test5 = typeof getCount extends () => number ? true : false;

const assertCounter: [test4, test5] = [true, true];
```

###### counter-test.ts

```typescript
import { increment, getCount } from './counter.ts';

console.log('Initial count:', getCount()); // 0
increment();
increment();
console.log('After increments:', getCount()); // 2

// Type assertion
type test6 = ReturnType<typeof getCount> extends number ? true : false;
const assertCounterTest: test6 = true;
```

## Module Caching

Srcbook caches module imports:

###### cached-module.ts

```typescript
import { v4 as uuidv4 } from 'uuid';

// This ID will remain constant across imports
export const moduleId = uuidv4();

export function getId(): string {
  return moduleId;
}

// Type assertions
type test7 = typeof moduleId extends string ? true : false;
type test8 = typeof getId extends () => string ? true : false;

const assertModule: [test7, test8] = [true, true];
```

###### cache-test-1.ts

```typescript
import { moduleId as id1 } from './cached-module.ts';
console.log('First import ID:', id1);

// Type assertion
type test9 = typeof id1 extends string ? true : false;
const assertCache1: test9 = true;
```

###### cache-test-2.ts

```typescript
import { moduleId as id2 } from './cached-module.ts';
console.log('Second import ID:', id2);

// Verify both imports have the same ID
import { moduleId as id1 } from './cache-test-1.ts';
console.log('IDs match:', id1 === id2);

// Type assertion
type test10 = typeof id2 extends string ? true : false;
const assertCache2: test10 = true;
```

## Execution Order Dependencies

Cells can depend on each other's execution:

###### setup.ts

```typescript
export let initialized = false;

export function initialize(): void {
  initialized = true;
  console.log('Initialization complete');
}

// Type assertions
type test11 = typeof initialized extends boolean ? true : false;
type test12 = typeof initialize extends () => void ? true : false;

const assertSetup: [test11, test12] = [true, true];
```

###### dependent.ts

```typescript
import { initialized, initialize } from './setup.ts';

if (!initialized) {
  initialize();
}

export function performAction(): string {
  if (!initialized) {
    throw new Error('Must initialize first');
  }
  return 'Action performed';
}

// Type assertion
type test13 = typeof performAction extends () => string ? true : false;
const assertDependent: test13 = true;
```

## Memory Management

Understanding how Srcbook manages memory:

###### memory-usage.ts

```typescript
// Create a large array
const largeArray: number[] = Array(1000000).fill(0);

// Clear references when done
function cleanup(): void {
  // This allows the array to be garbage collected
  (globalThis as any).largeArray = undefined;
}

// Keep track of memory usage
function getMemoryUsage(): number {
  return process.memoryUsage().heapUsed;
}

const memoryBefore = getMemoryUsage();
console.log('Memory before:', memoryBefore);

cleanup();

const memoryAfter = getMemoryUsage();
console.log('Memory after:', memoryAfter);

// Type assertions
type test14 = typeof memoryBefore extends number ? true : false;
type test15 = typeof memoryAfter extends number ? true : false;

const assertMemory: [test14, test15] = [true, true];
```

## Cell Lifecycle

Understanding cell execution lifecycle:

###### lifecycle.ts

```typescript
interface CellState {
  status: 'idle' | 'running' | 'complete' | 'error';
  startTime?: number;
  endTime?: number;
  error?: Error;
}

class CellLifecycle {
  private state: CellState = { status: 'idle' };
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.state.status = 'running';
    this.state.startTime = Date.now();
    
    try {
      const result = await fn();
      this.state.status = 'complete';
      return result;
    } catch (error) {
      this.state.status = 'error';
      this.state.error = error as Error;
      throw error;
    } finally {
      this.state.endTime = Date.now();
    }
  }
  
  getState(): CellState {
    return { ...this.state };
  }
}

const lifecycle = new CellLifecycle();

// Test execution
await lifecycle.execute(async () => {
  return 'test complete';
});

const finalState = lifecycle.getState();

// Type assertions
type test16 = typeof lifecycle extends CellLifecycle ? true : false;
type test17 = typeof finalState extends CellState ? true : false;

const assertLifecycle: [test16, test17] = [true, true];
```

## Testing This Notebook

Run the tests:

```bash
npx tsx docs/testing/run-tests.ts docs/advanced/cell-execution.src.md
```

The test harness will:
1. Verify scope isolation
2. Test variable persistence
3. Check module caching
4. Validate execution order
5. Monitor memory usage

## Next Steps

- Explore [Language Service Integration](./language-service.src.md)
- Learn about [Testing in Notebooks](./testing.src.md)
- Study [Error Handling](./error-handling.src.md)