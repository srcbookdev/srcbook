<!-- srcbook:{"language":"typescript"} -->

# Error Handling in Srcbook

This notebook demonstrates effective error handling strategies in Srcbook notebooks, including type errors, runtime errors, and error recovery.

## Setup

First, let's set up our environment:

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "zod": "^3.22.4"
  }
}
```

## Type Error Handling

Handle TypeScript type errors effectively:

###### type-guards.ts

```typescript
// Define custom type guard
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

// Use type guards to handle unknown data
function processValue(value: unknown): string {
  if (isString(value)) {
    return value.toUpperCase();
  }
  if (isNumber(value)) {
    return value.toFixed(2);
  }
  throw new TypeError('Value must be string or number');
}

// Type assertions
type test1 = ReturnType<typeof processValue> extends string ? true : false;
const assertTypeGuards: test1 = true;
```

## Runtime Error Handling

Handle runtime errors gracefully:

###### error-types.ts

```typescript
// Custom error classes
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NetworkError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

class DatabaseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Type assertions
type test2 = ValidationError extends Error ? true : false;
type test3 = NetworkError extends Error ? true : false;
type test4 = DatabaseError extends Error ? true : false;

const assertErrorTypes: [test2, test3, test4] = [true, true, true];
```

## Error Recovery Strategies

Implement error recovery:

###### recovery-strategies.ts

```typescript
import { z } from 'zod';

// Define schema for validation
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(120)
});

type User = z.infer<typeof UserSchema>;

class ErrorRecovery {
  // Retry with exponential backoff
  async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxAttempts) break;
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError;
  }
  
  // Validate with fallback
  validateUser(data: unknown): Partial<User> {
    try {
      return UserSchema.parse(data);
    } catch (error) {
      // Return partial valid data
      const partial = UserSchema.partial().safeParse(data);
      return partial.success ? partial.data : {};
    }
  }
  
  // Circuit breaker
  createCircuitBreaker<T>(
    fn: () => Promise<T>,
    threshold: number = 3,
    resetTimeout: number = 5000
  ): () => Promise<T> {
    let failures = 0;
    let lastFailure: number | null = null;
    
    return async () => {
      if (failures >= threshold) {
        const timeSinceLastFailure = lastFailure ? Date.now() - lastFailure : 0;
        if (timeSinceLastFailure < resetTimeout) {
          throw new Error('Circuit breaker open');
        }
        failures = 0;
      }
      
      try {
        return await fn();
      } catch (error) {
        failures++;
        lastFailure = Date.now();
        throw error;
      }
    };
  }
}

// Type assertions
type test5 = ErrorRecovery extends { retry<T>(fn: () => Promise<T>): Promise<T> } ? true : false;
type test6 = ReturnType<ErrorRecovery['validateUser']> extends Partial<User> ? true : false;

const assertRecovery: [test5, test6] = [true, true];
```

## Error Context Preservation

Maintain error context:

###### error-context.ts

```typescript
class ErrorContext {
  private context: Map<string, unknown> = new Map();
  
  addContext(key: string, value: unknown): void {
    this.context.set(key, value);
  }
  
  getContext(): Record<string, unknown> {
    return Object.fromEntries(this.context);
  }
  
  clearContext(): void {
    this.context.clear();
  }
  
  wrapError(error: Error): Error {
    const contextData = this.getContext();
    return Object.assign(error, { context: contextData });
  }
}

class ErrorWithContext extends Error {
  constructor(
    message: string,
    public context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'ErrorWithContext';
  }
}

// Type assertions
type test7 = ErrorWithContext extends Error ? true : false;
type test8 = ErrorWithContext['context'] extends Record<string, unknown> ? true : false;

const assertContext: [test7, test8] = [true, true];
```

## Debug Information Access

Access and format debug information:

###### debug-info.ts

```typescript
class DebugInfo {
  static getStackTrace(): string {
    const error = new Error();
    return error.stack ?? 'No stack trace available';
  }
  
  static async getMemoryUsage(): Promise<Record<string, number>> {
    const usage = process.memoryUsage();
    return {
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      rss: usage.rss
    };
  }
  
  static getEnvironmentInfo(): Record<string, unknown> {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    };
  }
  
  static async captureDebugSnapshot(): Promise<Record<string, unknown>> {
    return {
      timestamp: new Date().toISOString(),
      stack: this.getStackTrace(),
      memory: await this.getMemoryUsage(),
      environment: this.getEnvironmentInfo()
    };
  }
}

// Type assertions
type test9 = ReturnType<typeof DebugInfo.getStackTrace> extends string ? true : false;
type test10 = ReturnType<typeof DebugInfo.captureDebugSnapshot> extends Promise<Record<string, unknown>> ? true : false;

const assertDebug: [test9, test10] = [true, true];
```

## Testing This Notebook

Run the tests:

```bash
npx tsx docs/testing/run-tests.ts docs/advanced/error-handling.src.md
```

The test harness will:
1. Verify error handling
2. Test recovery strategies
3. Check context preservation
4. Validate debug information

## Next Steps

- Explore [Interoperability](./interoperability.src.md)
- Learn about [Advanced Cell Features](./advanced-cells.src.md)
- Study [Performance Optimization](./performance.src.md)