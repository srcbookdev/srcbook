<!-- srcbook:{"language":"typescript"} -->

# Srcbook API Reference

This document provides technical documentation for Srcbook's core APIs, types, and interfaces.

## Core Types

### Session

The Session represents a running Srcbook instance:

###### session-type.ts

```typescript
interface SessionType {
  /** Unique identifier for the session */
  id: string;
  
  /** Path to the directory containing srcbook files */
  dir: string;
  
  /** Array of cells in the srcbook */
  cells: CellType[];
  
  /** Programming language used ('typescript' or 'javascript') */
  language: CodeLanguageType;
  
  /** Optional TypeScript configuration */
  'tsconfig.json'?: string;
  
  /** Timestamp when the session was opened */
  openedAt: number;
}
```

### Cells

Cells are the fundamental building blocks of a Srcbook:

###### cell-types.ts

```typescript
/** Base properties for all cell types */
interface BaseCellType {
  id: string;
  type: string;
}

/** Markdown content cell */
interface MarkdownCellType extends BaseCellType {
  type: 'markdown';
  text: string;
}

/** Title cell (h1 heading) */
interface TitleCellType extends BaseCellType {
  type: 'title';
  text: string;
}

/** Code execution cell */
interface CodeCellType extends BaseCellType {
  type: 'code';
  source: string;
  language: CodeLanguageType;
  filename: string;
  status: CellStatus;
}

/** Special package.json cell */
interface PackageJsonCellType extends BaseCellType {
  type: 'package.json';
  source: string;
  filename: 'package.json';
  status: CellStatus;
}

/** Union type of all possible cells */
type CellType = 
  | MarkdownCellType 
  | TitleCellType 
  | CodeCellType 
  | PackageJsonCellType;

/** Possible cell execution states */
type CellStatus = 'idle' | 'running' | 'error';

/** Supported programming languages */
type CodeLanguageType = 'typescript' | 'javascript';
```

## File Format

### Srcbook Metadata

Metadata is stored in HTML comments at the start of .src.md files:

###### metadata-example.ts

```typescript
interface SrcbookMetadata {
  /** Programming language for the srcbook */
  language: CodeLanguageType;
  
  /** Optional TypeScript configuration */
  'tsconfig.json'?: {
    compilerOptions: {
      [key: string]: any;
    };
  };
}

// Example metadata comment:
// <!-- srcbook:{"language":"typescript"} -->
```

### File Structure

The .src.md file format follows these rules:

1. Must begin with metadata comment
2. Must have exactly one h1 title
3. Can contain markdown cells
4. Code cells are defined by h6 headings + code blocks

## CLI API

The Srcbook CLI provides these commands:

```bash
# Start the Srcbook server
srcbook start [options]

# Import a Srcbook
srcbook import [options] <specifier>

# Display help
srcbook help [command]
```

### Start Options

```typescript
interface StartOptions {
  /** Port to run the server on */
  port?: number;
  
  /** Directory to store srcbooks */
  dir?: string;
  
  /** Disable analytics collection */
  noAnalytics?: boolean;
}
```

### Import Options

```typescript
interface ImportOptions {
  /** Target directory for the import */
  dir?: string;
  
  /** Force overwrite existing files */
  force?: boolean;
}
```

## Server API

### HTTP Server

The main HTTP server provides:
- Static file serving
- API endpoints
- WebSocket upgrade handling

```typescript
import { app } from '@srcbook/api';

// Configure port
const port = process.env.PORT || 3000;

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

### WebSocket Server

Real-time communication for:
- Cell execution
- Output streaming
- State synchronization

```typescript
import { wss } from '@srcbook/api';

wss.on('connection', (ws) => {
  // Handle new connections
  ws.on('message', (data) => {
    // Handle incoming messages
  });
});
```

## Environment Variables

```typescript
interface Environment {
  /** Port for the HTTP server */
  PORT?: string;
  
  /** Directory to store srcbooks */
  SRCBOOK_DIR?: string;
  
  /** Disable analytics collection */
  SRCBOOK_DISABLE_ANALYTICS?: string;
  
  /** AI provider API key */
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}
```

## Constants

```typescript
/** Default directory for storing srcbooks */
export const SRCBOOKS_DIR: string;

/** Distribution directory path */
export const DIST_DIR: string;
```

## Best Practices

1. **Cell Management**
   - Keep cells focused and single-purpose
   - Use meaningful filenames
   - Group related functionality

2. **Type Safety**
   - Use TypeScript when possible
   - Define interfaces for data structures
   - Enable strict mode

3. **Error Handling**
   - Check cell execution status
   - Handle WebSocket disconnections
   - Validate user input

4. **Security**
   - Use environment variables for secrets
   - Validate file paths
   - Sanitize user input

## Next Steps

- Try the [Getting Started](./getting-started.src.md) guide
- Explore [Examples](./examples.src.md)
- Read about [Features](./features.src.md)
- Join our [Discord](https://discord.gg/shDEGBSe2d)