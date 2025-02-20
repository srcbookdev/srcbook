<!-- srcbook:{"language":"typescript"} -->

# Performance Optimization in Srcbook

This notebook demonstrates strategies for optimizing performance in Srcbook notebooks, including type checking, compilation, and execution optimizations.

## Setup

First, let's set up our environment:

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "typescript": "^5.3.3",
    "node-cache": "^5.1.2"
  }
}
```

## Type Checking Strategies

Optimize type checking performance:

###### tsconfig.json

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./.tsbuildinfo",
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

###### type-check-demo.ts

```typescript
// Use type aliases for complex types
type ComplexObject = {
  id: string;
  data: {
    values: number[];
    metadata: {
      [key: string]: string | number | boolean;
    };
  };
};

// Instead of repeating complex types
function processObject(obj: ComplexObject): ComplexObject['data']['values'] {
  return obj.data.values.map(v => v * 2);
}

// Use mapped types for repetitive structures
type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

// Type assertions
type test1 = ComplexObject['data']['values'] extends number[] ? true : false;
type test2 = Nullable<ComplexObject> extends { id: string | null } ? true : false;

const assertTypes: [test1, test2] = [true, true];
```

## Incremental Compilation

Leverage incremental compilation:

###### build-cache.ts

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface BuildCache {
  version: string;
  files: {
    [path: string]: {
      hash: string;
      mtime: number;
    };
  };
}

class BuildManager {
  private cache: BuildCache = {
    version: '1.0.0',
    files: {}
  };
  
  private cacheFile = '.buildcache';
  
  loadCache(): void {
    if (fs.existsSync(this.cacheFile)) {
      this.cache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
    }
  }
  
  saveCache(): void {
    fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
  }
  
  needsRebuild(filePath: string): boolean {
    const stats = fs.statSync(filePath);
    const cached = this.cache.files[filePath];
    
    if (!cached) return true;
    
    return cached.mtime !== stats.mtimeMs;
  }
  
  updateFile(filePath: string): void {
    const stats = fs.statSync(filePath);
    this.cache.files[filePath] = {
      hash: Date.now().toString(),
      mtime: stats.mtimeMs
    };
  }
}

// Type assertions
type test3 = typeof BuildManager extends new () => { loadCache(): void } ? true : false;
const assertBuild: test3 = true;
```

## Project Structure Optimization

Organize code for better performance:

###### barrel-exports.ts

```typescript
// Instead of individual imports
export * from './types/index.js';
export * from './utils/index.js';
export * from './models/index.js';

// Type-only exports
export type { Config } from './config.js';
```

###### optimized-imports.ts

```typescript
// Use specific imports instead of namespace imports
import { useState, useEffect } from 'react';

// Instead of
// import * as React from 'react';

// Use type imports for types
import type { ReactNode } from 'react';

// Type assertions
type test4 = typeof useState extends Function ? true : false;
type test5 = ReactNode extends any ? true : false;

const assertImports: [test4, test5] = [true, true];
```

## Memory Usage Optimization

Manage memory efficiently:

###### memory-manager.ts

```typescript
import NodeCache from 'node-cache';

class MemoryManager {
  private cache: NodeCache;
  private maxItems: number;
  
  constructor(maxItems: number = 1000) {
    this.maxItems = maxItems;
    this.cache = new NodeCache({
      maxKeys: maxItems,
      stdTTL: 600 // 10 minutes
    });
  }
  
  set<T>(key: string, value: T): void {
    if (this.cache.keys().length >= this.maxItems) {
      // Remove oldest item
      const oldestKey = this.cache.keys()[0];
      this.cache.del(oldestKey);
    }
    this.cache.set(key, value);
  }
  
  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }
  
  clear(): void {
    this.cache.flushAll();
  }
}

// Type assertions
type test6 = MemoryManager extends { set<T>(key: string, value: T): void } ? true : false;
const assertMemory: test6 = true;
```

## Execution Time Improvements

Optimize code execution:

###### performance-utils.ts

```typescript
class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  
  start(label: string): void {
    this.marks.set(label, performance.now());
  }
  
  end(label: string): number {
    const start = this.marks.get(label);
    if (!start) throw new Error(`No start mark for ${label}`);
    
    const duration = performance.now() - start;
    this.marks.delete(label);
    return duration;
  }
  
  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    const result = await fn();
    const duration = this.end(label);
    console.log(`${label}: ${duration.toFixed(2)}ms`);
    return result;
  }
}

// Usage example
const monitor = new PerformanceMonitor();

async function expensiveOperation(): Promise<number[]> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(Array(1000).fill(0).map((_, i) => i));
    }, 100);
  });
}

await monitor.measure('expensive-op', expensiveOperation);

// Type assertions
type test7 = typeof monitor.measure extends <T>(label: string, fn: () => Promise<T>) => Promise<T> ? true : false;
const assertPerformance: test7 = true;
```

## Lazy Loading

Implement lazy loading for better performance:

###### lazy-loader.ts

```typescript
class LazyLoader<T> {
  private instance: T | null = null;
  private loading = false;
  private callbacks: ((instance: T) => void)[] = [];
  
  constructor(private factory: () => Promise<T>) {}
  
  async getInstance(): Promise<T> {
    if (this.instance) return this.instance;
    
    if (this.loading) {
      return new Promise(resolve => {
        this.callbacks.push(resolve);
      });
    }
    
    this.loading = true;
    this.instance = await this.factory();
    this.loading = false;
    
    this.callbacks.forEach(cb => cb(this.instance!));
    this.callbacks = [];
    
    return this.instance;
  }
  
  clearInstance(): void {
    this.instance = null;
  }
}

// Example usage
const lazyData = new LazyLoader(async () => {
  // Simulate expensive data loading
  await new Promise(resolve => setTimeout(resolve, 100));
  return { data: 'loaded' };
});

const data = await lazyData.getInstance();

// Type assertions
type test8 = typeof lazyData.getInstance extends () => Promise<{ data: string }> ? true : false;
const assertLazy: test8 = true;
```

## Testing This Notebook

Run the tests:

```bash
npx tsx docs/testing/run-tests.ts docs/advanced/performance.src.md
```

The test harness will:
1. Verify type assertions
2. Measure execution times
3. Check memory usage
4. Validate optimizations

## Next Steps

- Explore [Error Handling](./error-handling.src.md)
- Learn about [Interoperability](./interoperability.src.md)
- Study [Advanced Cell Features](./advanced-cells.src.md)