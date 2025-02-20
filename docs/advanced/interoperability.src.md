<!-- srcbook:{"language":"typescript"} -->

# Interoperability in Srcbook

This notebook demonstrates how Srcbook notebooks can interact with different environments, technologies, and programming paradigms.

## Setup

First, let's set up our environment:

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "node-fetch": "^3.3.2",
    "ws": "^8.16.0",
    "@types/node": "^20.11.5",
    "@types/ws": "^8.5.10"
  }
}
```

## JavaScript/TypeScript Mixing

Mix JavaScript and TypeScript code:

###### javascript-module.js

```javascript
// Plain JavaScript module
export function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

export function formatPrice(price) {
  return `$${price.toFixed(2)}`;
}

// JSDoc for TypeScript support
/**
 * @typedef {Object} Item
 * @property {string} name
 * @property {number} price
 */

/**
 * @param {Item[]} items
 * @returns {Item}
 */
export function getMostExpensive(items) {
  return items.reduce((max, item) => 
    item.price > max.price ? item : max
  );
}
```

###### typescript-consumer.ts

```typescript
import { calculateTotal, formatPrice, getMostExpensive } from './javascript-module.js';

// Define TypeScript interface matching JSDoc
interface Item {
  name: string;
  price: number;
}

// Use JavaScript functions with TypeScript types
const items: Item[] = [
  { name: 'Book', price: 29.99 },
  { name: 'Pen', price: 4.99 },
  { name: 'Desk', price: 199.99 }
];

const total = calculateTotal(items);
const formatted = formatPrice(total);
const expensive = getMostExpensive(items);

// Type assertions
type test1 = typeof total extends number ? true : false;
type test2 = typeof formatted extends string ? true : false;
type test3 = typeof expensive extends Item ? true : false;

const assertJSTS: [test1, test2, test3] = [true, true, true];
```

## External Module Usage

Work with external Node.js modules:

###### http-client.ts

```typescript
import fetch from 'node-fetch';
import type { Response } from 'node-fetch';

interface ApiResponse<T> {
  data: T;
  status: number;
}

async function fetchJson<T>(url: string): Promise<ApiResponse<T>> {
  const response: Response = await fetch(url);
  const data: T = await response.json();
  
  return {
    data,
    status: response.status
  };
}

// Example usage
interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

const result = await fetchJson<Todo>(
  'https://jsonplaceholder.typicode.com/todos/1'
);

// Type assertions
type test4 = typeof fetchJson extends <T>(url: string) => Promise<ApiResponse<T>> ? true : false;
type test5 = typeof result.data extends Todo ? true : false;

const assertFetch: [test4, test5] = [true, true];
```

## Node.js API Integration

Use Node.js built-in APIs:

###### file-operations.ts

```typescript
import { promises as fs } from 'fs';
import * as path from 'path';

class FileManager {
  constructor(private basePath: string) {}
  
  async readJsonFile<T>(filename: string): Promise<T> {
    const filePath = path.join(this.basePath, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }
  
  async writeJsonFile<T>(filename: string, data: T): Promise<void> {
    const filePath = path.join(this.basePath, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }
  
  async listFiles(): Promise<string[]> {
    const files = await fs.readdir(this.basePath);
    return files.filter(file => file.endsWith('.json'));
  }
}

// Type assertions
type test6 = FileManager extends { readJsonFile<T>(filename: string): Promise<T> } ? true : false;
type test7 = FileManager extends { writeJsonFile<T>(filename: string, data: T): Promise<void> } ? true : false;

const assertFileOps: [test6, test7] = [true, true];
```

## Browser API Access

Access browser APIs when available:

###### browser-apis.ts

```typescript
// Type-safe browser API detection
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

class BrowserIntegration {
  private supported: boolean;
  
  constructor() {
    this.supported = isBrowser();
  }
  
  async getLocation(): Promise<GeolocationPosition | null> {
    if (!this.supported || !navigator.geolocation) {
      return null;
    }
    
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }
  
  async storeData(key: string, data: unknown): Promise<void> {
    if (!this.supported) return;
    
    localStorage.setItem(key, JSON.stringify(data));
  }
  
  getData<T>(key: string): T | null {
    if (!this.supported) return null;
    
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }
}

// Type assertions
type test8 = ReturnType<typeof isBrowser> extends boolean ? true : false;
type test9 = BrowserIntegration extends { getData<T>(key: string): T | null } ? true : false;

const assertBrowser: [test8, test9] = [true, true];
```

## Native Module Support

Work with native Node.js modules:

###### websocket-server.ts

```typescript
import { WebSocket, WebSocketServer } from 'ws';

class WsManager {
  private server: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  
  constructor(port: number) {
    this.server = new WebSocketServer({ port });
    
    this.server.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      
      ws.on('message', (message: string) => {
        this.broadcast(message);
      });
      
      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });
  }
  
  broadcast(message: string): void {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
  
  close(): void {
    this.server.close();
  }
}

// Type assertions
type test10 = WsManager extends { broadcast(message: string): void } ? true : false;
const assertWs: test10 = true;
```

## Testing This Notebook

Run the tests:

```bash
npx tsx docs/testing/run-tests.ts docs/advanced/interoperability.src.md
```

The test harness will:
1. Verify JavaScript/TypeScript interop
2. Test external module usage
3. Check Node.js API integration
4. Validate browser API handling

## Next Steps

- Explore [Advanced Cell Features](./advanced-cells.src.md)
- Learn about [Error Handling](./error-handling.src.md)
- Study [Performance Optimization](./performance.src.md)