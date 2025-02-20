<!-- srcbook:{"language":"typescript"} -->

# Testing in Srcbook Notebooks

This notebook demonstrates how to write and run tests within Srcbook notebooks, including unit testing, test runners, and coverage reporting.

## Setup

First, let's set up our testing environment:

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "vitest": "^1.2.1",
    "c8": "^9.1.0",
    "@types/node": "^20.11.5"
  }
}
```

## Unit Testing Basics

Basic test structure in notebooks:

###### math-utils.ts

```typescript
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}
```

###### math-utils.test.ts

```typescript
import { expect, test, describe } from 'vitest';
import { add, multiply, divide } from './math-utils.ts';

describe('Math Utils', () => {
  test('add combines two numbers', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
    expect(add(0, 0)).toBe(0);
  });
  
  test('multiply products two numbers', () => {
    expect(multiply(2, 3)).toBe(6);
    expect(multiply(-2, 3)).toBe(-6);
    expect(multiply(0, 5)).toBe(0);
  });
  
  test('divide handles division correctly', () => {
    expect(divide(6, 2)).toBe(3);
    expect(divide(-6, 2)).toBe(-3);
    expect(() => divide(5, 0)).toThrow('Division by zero');
  });
});

// Type assertions
type test1 = typeof add extends (a: number, b: number) => number ? true : false;
type test2 = typeof multiply extends (a: number, b: number) => number ? true : false;
type test3 = typeof divide extends (a: number, b: number) => number ? true : false;

const assertFunctions: [test1, test2, test3] = [true, true, true];
```

## Test Runner Integration

Configure test runners in notebooks:

###### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/']
    }
  }
});
```

## Assertion Libraries

Using different assertion styles:

###### string-utils.ts

```typescript
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function reverse(str: string): string {
  return str.split('').reverse().join('');
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str;
}
```

###### string-utils.test.ts

```typescript
import { expect, test, describe } from 'vitest';
import { capitalize, reverse, truncate } from './string-utils.ts';

describe('String Utils', () => {
  // Using toBe
  test('capitalize transforms first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
  });
  
  // Using toEqual
  test('reverse flips string characters', () => {
    expect(reverse('hello')).toEqual('olleh');
    expect(reverse('12345')).toEqual('54321');
  });
  
  // Using multiple assertions
  test('truncate handles strings correctly', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
    expect(truncate('hi', 5)).toBe('hi');
    expect(truncate('', 5)).toBe('');
  });
});

// Type assertions
type test4 = typeof capitalize extends (str: string) => string ? true : false;
type test5 = typeof reverse extends (str: string) => string ? true : false;
type test6 = typeof truncate extends (str: string, length: number) => string ? true : false;

const assertStringFunctions: [test4, test5, test6] = [true, true, true];
```

## Mocking and Stubbing

Implement test doubles:

###### api-client.ts

```typescript
export interface ApiClient {
  fetch<T>(url: string): Promise<T>;
  post<T>(url: string, data: unknown): Promise<T>;
}

export class RealApiClient implements ApiClient {
  async fetch<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json();
  }
  
  async post<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.json();
  }
}
```

###### api-client.test.ts

```typescript
import { expect, test, describe, vi } from 'vitest';
import type { ApiClient } from './api-client.ts';

// Create mock implementation
const mockApiClient: ApiClient = {
  fetch: vi.fn(),
  post: vi.fn()
};

describe('API Client', () => {
  test('fetch returns data', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockApiClient.fetch.mockResolvedValue(mockData);
    
    const result = await mockApiClient.fetch('/test');
    expect(result).toEqual(mockData);
    expect(mockApiClient.fetch).toHaveBeenCalledWith('/test');
  });
  
  test('post sends data', async () => {
    const mockResponse = { success: true };
    const mockData = { name: 'Test' };
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    const result = await mockApiClient.post('/test', mockData);
    expect(result).toEqual(mockResponse);
    expect(mockApiClient.post).toHaveBeenCalledWith('/test', mockData);
  });
});

// Type assertions
type test7 = typeof mockApiClient extends ApiClient ? true : false;
const assertMock: test7 = true;
```

## Test Coverage

Configure and run coverage reports:

###### coverage-config.ts

```typescript
import { defineConfig } from 'c8';

export default defineConfig({
  include: ['src/**/*.ts'],
  exclude: ['**/*.test.ts', '**/*.d.ts'],
  reporter: ['text', 'html'],
  all: true
});
```

## Test Organization

Structure tests effectively:

###### test-utils.ts

```typescript
import { expect } from 'vitest';

export function createTestSuite(name: string, tests: Record<string, () => void | Promise<void>>) {
  describe(name, () => {
    for (const [testName, testFn] of Object.entries(tests)) {
      test(testName, testFn);
    }
  });
}

export function expectError(fn: () => unknown, message?: string) {
  expect(fn).toThrow(message);
}

// Type assertions
type test8 = typeof createTestSuite extends (name: string, tests: Record<string, () => void | Promise<void>>) => void ? true : false;
type test9 = typeof expectError extends (fn: () => unknown, message?: string) => void ? true : false;

const assertTestUtils: [test8, test9] = [true, true];
```

## Testing This Notebook

Run the tests:

```bash
npx tsx docs/testing/run-tests.ts docs/advanced/testing.src.md
```

The test harness will:
1. Run all test suites
2. Generate coverage reports
3. Verify type assertions
4. Check mock implementations

## Next Steps

- Explore [Performance Optimization](./performance.src.md)
- Learn about [Error Handling](./error-handling.src.md)
- Study [Interoperability](./interoperability.src.md)