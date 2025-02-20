<!-- srcbook:{"language":"typescript"} -->

# Srcbook Examples

This guide provides practical examples of using Srcbook for various development scenarios. Each example demonstrates different features and capabilities of the platform.

## Quick Import

You can import any of these examples using the srcbook CLI:

```bash
npx srcbook@latest import <example-name>
```

## Available Examples

### 1. Getting Started
A quick tutorial exploring basic Srcbook concepts.

```bash
npx srcbook@latest import getting-started
```

Key concepts covered:
- Basic cell types
- npm package usage
- Cell imports/exports
- Using secrets
- AI features

### 2. Web Development with TypeScript
Build a simple web application using TypeScript and modern web APIs.

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17"
  }
}
```

###### server.ts

```typescript
import express from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
app.use(cors());
app.use(express.json());

// Data validation schema
const TodoSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().default(false)
});

type Todo = z.infer<typeof TodoSchema>;
const todos: Todo[] = [];

// REST endpoints
app.get('/todos', (req, res) => {
  res.json(todos);
});

app.post('/todos', (req, res) => {
  const result = TodoSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json(result.error);
  }
  todos.push(result.data);
  res.status(201).json(result.data);
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

### 3. LangGraph Agent Example
Build a stateful AI agent with memory using LangGraph and Tavily.

```bash
npx srcbook@latest import langgraph-web-agent
```

Features demonstrated:
- AI agent implementation
- State management
- API integration
- TypeScript types for AI

### 4. WebSocket Communication
Learn to build WebSocket clients and servers.

```bash
npx srcbook@latest import websockets
```

###### websocket-server.ts

```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    // Echo back to client
    ws.send(`Server received: ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log('WebSocket server running on ws://localhost:8080');
```

###### websocket-client.ts

```typescript
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected to server');
  ws.send('Hello from client!');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('close', () => {
  console.log('Disconnected from server');
});
```

### 5. Data Processing Pipeline
Example of building a data processing pipeline with TypeScript.

###### types.ts

```typescript
interface DataRecord {
  id: string;
  timestamp: Date;
  value: number;
}

interface ProcessedRecord extends DataRecord {
  normalized: number;
  category: 'low' | 'medium' | 'high';
}

export type { DataRecord, ProcessedRecord };
```

###### processing.ts

```typescript
import type { DataRecord, ProcessedRecord } from './types.ts';

export function normalizeValue(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

export function categorizeValue(normalized: number): 'low' | 'medium' | 'high' {
  if (normalized < 0.33) return 'low';
  if (normalized < 0.66) return 'medium';
  return 'high';
}

export function processRecord(record: DataRecord): ProcessedRecord {
  const normalized = normalizeValue(record.value, 0, 100);
  return {
    ...record,
    normalized,
    category: categorizeValue(normalized)
  };
}
```

###### main.ts

```typescript
import type { DataRecord } from './types.ts';
import { processRecord } from './processing.ts';

// Sample data
const records: DataRecord[] = [
  { id: '1', timestamp: new Date(), value: 25 },
  { id: '2', timestamp: new Date(), value: 75 },
  { id: '3', timestamp: new Date(), value: 50 }
];

// Process records
const processed = records.map(processRecord);
console.log('Processed records:', processed);
```

## Community Examples

The Srcbook community regularly contributes new examples. Visit the [hub](https://hub.srcbook.com) to discover more examples like:

1. Web Scraping with Puppeteer
2. GraphQL API Development
3. React Component Library
4. Machine Learning with TensorFlow.js
5. Game Development with Phaser

## Contributing Examples

Want to share your own example?

1. Create a .src.md file
2. Test it thoroughly
3. Email feedback@srcbook.com

## Next Steps

- Try the [Getting Started](./getting-started.src.md) guide
- Learn about [Features](./features.src.md)
- Read the [API Reference](./api-reference.src.md)
- Join our [Discord](https://discord.gg/shDEGBSe2d)