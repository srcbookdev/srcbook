<!-- srcbook:{"language":"typescript"} -->

# TypeScript Configuration in Srcbook

This notebook explains how to configure TypeScript in Srcbook notebooks, including module resolution, type checking, and other compiler options.

## Basic Configuration

Every TypeScript notebook can have its own configuration:

###### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["node"]
  }
}
```

## Testing the Configuration

Let's verify our configuration works:

###### config-test.ts

```typescript
// This should work with ES2020 features
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
const doubled = numbers.map(n => n * 2);

// Verify configuration
const config = {
  target: "ES2020",
  moduleResolution: "bundler",
  strict: true
} as const;

// Type assertions to test configuration
type test1 = typeof sum extends number ? true : false;
type test2 = typeof doubled extends number[] ? true : false;

const assertResults: [test1, test2] = [true, true];
```

## Module Resolution

Srcbook supports different module resolution strategies:

###### module-config.json

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@utils/*": ["./utils/*"],
      "@types/*": ["./types/*"]
    }
  }
}
```

Let's test path aliases:

###### types/models.ts

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
}
```

###### utils/user-helpers.ts

```typescript
import type { User } from '@types/models';

export function formatUserName(user: User): string {
  return `${user.name} <${user.email}>`;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

###### path-alias-test.ts

```typescript
import type { User } from '@types/models';
import { formatUserName, validateEmail } from '@utils/user-helpers';

const user: User = {
  id: "1",
  name: "John Doe",
  email: "john@example.com"
};

const formatted = formatUserName(user);
const isValidEmail = validateEmail(user.email);

// Type assertions
type test3 = typeof formatted extends string ? true : false;
type test4 = typeof isValidEmail extends boolean ? true : false;

const assertPathResults: [test3, test4] = [true, true];
```

## Type Checking Options

Configure type checking strictness:

###### strict-config.json

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

Test strict type checking:

###### strict-checking.ts

```typescript
// Strict null checks
function getLength(str: string | null): number {
  if (str === null) {
    return 0;
  }
  return str.length;
}

// No implicit any
function map<T, U>(array: T[], fn: (item: T) => U): U[] {
  return array.map(fn);
}

// Strict property initialization
class User {
  private name: string; // Error without initialization
  private email: string;

  constructor() {
    this.name = ""; // Required
    this.email = ""; // Required
  }
}

// No unchecked indexed access
const arr = [1, 2, 3];
const item = arr[0]; // type is number | undefined

// Type assertions
type test5 = typeof getLength extends (str: string | null) => number ? true : false;
type test6 = typeof map extends <T, U>(array: T[], fn: (item: T) => U) => U[] ? true : false;

const assertStrictResults: [test5, test6] = [true, true];
```

## Project References

Configure project references for modular development:

###### project-refs.json

```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "references": [
    { "path": "../shared" },
    { "path": "../utils" }
  ]
}
```

Test project references:

###### reference-test.ts

```typescript
import { SharedType } from '../shared/types';
import { UtilFunction } from '../utils/functions';

// Mock implementations for testing
type SharedType = {
  id: string;
  value: number;
};

const UtilFunction = (x: number) => x * 2;

// Usage
const shared: SharedType = {
  id: "1",
  value: 42
};

const result = UtilFunction(shared.value);

// Type assertions
type test7 = typeof shared extends { id: string; value: number } ? true : false;
type test8 = typeof result extends number ? true : false;

const assertRefResults: [test7, test8] = [true, true];
```

## Performance Optimization

Configure for optimal performance:

###### performance-config.json

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./.tsbuildinfo",
    "skipLibCheck": true,
    "isolatedModules": true
  }
}
```

Test performance configurations:

###### performance-test.ts

```typescript
// Large type definition to test performance
type DeepNested = {
  a: {
    b: {
      c: {
        d: {
          e: string;
        };
      };
    };
  };
};

// Create a large union type
type Union100 = 
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  // ... (repeated for demonstration)
  | 91 | 92 | 93 | 94 | 95 | 96 | 97 | 98 | 99 | 100;

// Usage
const nested: DeepNested = {
  a: {
    b: {
      c: {
        d: {
          e: "deep"
        }
      }
    }
  }
};

const union: Union100 = 42;

// Type assertions
type test9 = typeof nested.a.b.c.d.e extends string ? true : false;
type test10 = typeof union extends number ? true : false;

const assertPerfResults: [test9, test10] = [true, true];
```

## Testing This Notebook

Run the tests:

```bash
npx tsx docs/testing/run-tests.ts docs/advanced/typescript-config.src.md
```

The test harness will:
1. Validate all configurations
2. Check type assertions
3. Verify module resolution
4. Test strict mode compliance

## Next Steps

- Explore [Debugging Features](./debugging.src.md)
- Learn about [Language Service Integration](./language-service.src.md)
- Study [Performance Optimization](./performance.src.md)