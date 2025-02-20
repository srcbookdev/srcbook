<!-- srcbook:{"language":"typescript"} -->

# Advanced TypeScript Features in Srcbook

This notebook demonstrates advanced TypeScript features and how they can be used effectively in Srcbook notebooks.

## Setup

First, let's set up our environment with some useful types:

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "zod": "^3.22.4"
  }
}
```

## Type Inference

TypeScript's type inference in Srcbook is powerful and contextual:

###### type-inference.ts

```typescript
// Basic inference
const numbers = [1, 2, 3, 4, 5]; // inferred as number[]
const mixed = [1, "hello", true]; // inferred as (string | number | boolean)[]

// Function return type inference
function createPair<T>(first: T, second: T) {
  return { first, second };
}

const numberPair = createPair(1, 2);
const stringPair = createPair("hello", "world");

// Contextual typing with callbacks
const doubled = numbers.map(n => n * 2); // n is inferred as number
const filtered = numbers.filter(n => n > 2); // n is inferred as number

// Assert types match expectations
type test1 = typeof numberPair.first extends number ? true : false;
type test2 = typeof stringPair.second extends string ? true : false;
type test3 = typeof doubled extends number[] ? true : false;
type test4 = typeof filtered extends number[] ? true : false;

// These should all be true
type TestResults = [test1, test2, test3, test4];
const assertResults: TestResults = [true, true, true, true];
```

## Generic Types

Srcbook supports complex generic type patterns:

###### generic-types.ts

```typescript
// Generic interface
interface Container<T> {
  value: T;
  map<U>(fn: (value: T) => U): Container<U>;
}

// Generic class implementation
class Box<T> implements Container<T> {
  constructor(public value: T) {}
  
  map<U>(fn: (value: T) => U): Container<U> {
    return new Box(fn(this.value));
  }
}

// Generic constraints
interface HasLength {
  length: number;
}

function longest<T extends HasLength>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

// Usage examples
const numberBox = new Box(42);
const stringBox = numberBox.map(n => n.toString());

const longestArray = longest([1, 2], [1, 2, 3]);
const longestString = longest("hello", "world");

// Type assertions
type test5 = typeof stringBox.value extends string ? true : false;
type test6 = typeof longestArray extends number[] ? true : false;
type test7 = typeof longestString extends string ? true : false;

const assertGenericResults: [test5, test6, test7] = [true, true, true];
```

## Module Augmentation

Srcbook allows extending existing modules:

###### string-extensions.ts

```typescript
// Declare module augmentation
declare global {
  interface String {
    toTitleCase(): string;
    truncate(length: number): string;
  }
}

// Implement new methods
String.prototype.toTitleCase = function(this: string): string {
  return this.replace(/\b\w/g, c => c.toUpperCase());
};

String.prototype.truncate = function(this: string, length: number): string {
  return this.length > length ? this.slice(0, length) + '...' : this;
};

// Usage example
const title = "hello world".toTitleCase();
const truncated = "This is a long string".truncate(10);

// Type assertions
type test8 = typeof title extends string ? true : false;
type test9 = typeof truncated extends string ? true : false;

const assertAugmentationResults: [test8, test9] = [true, true];
```

## Declaration Merging

TypeScript's declaration merging in action:

###### declaration-merging.ts

```typescript
// Interface merging
interface Animal {
  name: string;
}

interface Animal {
  age: number;
}

// The interfaces are merged
const cat: Animal = {
  name: "Whiskers",
  age: 3
};

// Namespace and class merging
class API {
  static baseUrl: string = "https://api.example.com";
}

namespace API {
  export function endpoint(path: string) {
    return `${API.baseUrl}${path}`;
  }
}

// Usage example
const apiUrl = API.endpoint("/users");

// Type assertions
type test10 = typeof cat extends { name: string; age: number } ? true : false;
type test11 = typeof apiUrl extends string ? true : false;

const assertMergeResults: [test10, test11] = [true, true];
```

## Ambient Declarations

Working with external JavaScript libraries:

###### ambient-declarations.ts

```typescript
// Declare an external library
declare namespace ExternalLib {
  function calculate(x: number): number;
  const version: string;
  
  interface Config {
    timeout: number;
    retries: number;
  }
}

// Mock implementation for testing
const ExternalLib = {
  calculate: (x: number) => x * 2,
  version: "1.0.0",
} as const;

// Usage with type safety
const result = ExternalLib.calculate(21);
const version = ExternalLib.version;

// Type assertions
type test12 = typeof result extends number ? true : false;
type test13 = typeof version extends string ? true : false;

const assertAmbientResults: [test12, test13] = [true, true];
```

## Type Guards and Assertions

Advanced type narrowing techniques:

###### type-guards.ts

```typescript
// User-defined type guard
interface Bird {
  fly(): void;
  layEggs(): void;
}

interface Fish {
  swim(): void;
  layEggs(): void;
}

function isBird(pet: Bird | Fish): pet is Bird {
  return 'fly' in pet;
}

// Type assertion functions
function assertIsNumber(value: unknown): asserts value is number {
  if (typeof value !== 'number') {
    throw new Error('Value must be a number');
  }
}

// Usage example
function move(pet: Bird | Fish) {
  if (isBird(pet)) {
    pet.fly(); // TypeScript knows pet is Bird
  } else {
    pet.swim(); // TypeScript knows pet is Fish
  }
}

// Test implementations
const bird: Bird = {
  fly: () => console.log('Flying'),
  layEggs: () => console.log('Laying bird eggs')
};

const fish: Fish = {
  swim: () => console.log('Swimming'),
  layEggs: () => console.log('Laying fish eggs')
};

// Type assertions
type test14 = typeof bird extends Bird ? true : false;
type test15 = typeof fish extends Fish ? true : false;

const assertGuardResults: [test14, test15] = [true, true];
```

## Testing This Notebook

This notebook can be tested using the test harness:

```bash
npx tsx docs/testing/run-tests.ts docs/advanced/typescript-features.src.md
```

The test harness will:
1. Verify all type assertions
2. Execute all code cells
3. Confirm no type errors
4. Validate runtime behavior

## Next Steps

- Explore [TypeScript Configuration](./typescript-config.src.md)
- Learn about [Debugging](./debugging.src.md)
- Study [Cell Execution](./cell-execution.src.md)