<!-- srcbook:{"language":"typescript"} -->

# Getting Started with Srcbook

This guide will help you get started with Srcbook, walking you through installation, basic concepts, and your first Srcbook notebook.

## Installation

Srcbook runs locally on your machine as a CLI application with a web interface.

### Prerequisites

- Node.js v18 or later
- An AI provider API key (recommended: Anthropic with claude-3-5-sonnet-latest)
- npm, pnpm, or another package manager

### Quick Start

Run Srcbook using npx (recommended for latest version):

###### install-command.sh

```bash
# Using npm
npx srcbook@latest start

# Using pnpm
pnpm dlx srcbook@latest start
```

Or install globally:

###### global-install.sh

```bash
# Using npm
npm install -g srcbook

# Using pnpm
pnpm add -g srcbook

# Then run
srcbook start
```

## Core Concepts

### What is a Srcbook?

A Srcbook is an interactive notebook that combines:
- Markdown for documentation
- Executable TypeScript/JavaScript code
- AI-powered development assistance
- Package management
- Local execution environment

### Cell Types

1. **Markdown Cells**
   - Documentation and explanations
   - Support for rich formatting
   - Mermaid diagrams
   - Math equations

2. **Code Cells**
   - Executable TypeScript/JavaScript
   - File-based organization
   - Import/export capabilities
   - npm package support

## Your First Srcbook

Let's create a simple Srcbook that demonstrates the basic features:

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "chalk": "^5.3.0"
  }
}
```

### Basic Output

Let's start with a simple TypeScript example:

###### hello.ts

```typescript
console.log("Hello, Srcbook!");
```

### Using Types

TypeScript support comes built-in:

###### greeter.ts

```typescript
interface Greeting {
  message: string;
  timestamp: Date;
}

function createGreeting(name: string): Greeting {
  return {
    message: `Hello, ${name}!`,
    timestamp: new Date()
  };
}

console.log(createGreeting("Developer"));
```

### Using npm Packages

You can use any npm package by adding it to package.json:

###### colored-output.ts

```typescript
import chalk from 'chalk';

console.log(chalk.blue('This text is blue!'));
console.log(chalk.green('This text is green!'));
```

### Cell Communication

Cells can import from other cells:

###### math-utils.ts

```typescript
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}
```

###### calculator.ts

```typescript
import { add, multiply } from './math-utils.ts';

console.log(`2 + 3 = ${add(2, 3)}`);
console.log(`4 * 5 = ${multiply(4, 5)}`);
```

## Using AI Features

Srcbook includes powerful AI capabilities:

1. **Generate New Cells**
   - Click the "+" button
   - Choose "AI Generate"
   - Describe what you want

2. **Edit Existing Cells**
   - Click the sparkles icon
   - Describe your desired changes
   - Review and accept the diff

3. **Generate Complete Srcbooks**
   - From the home page
   - Enter a topic or goal
   - AI generates a full notebook

### AI Configuration

1. Open Settings (⚙️ icon)
2. Select AI Provider
3. Enter API Key
4. Optional: Configure local model via Ollama

## Best Practices

1. **Organization**
   - Use clear cell names
   - Group related functionality
   - Document with markdown
   - Keep cells focused

2. **Dependencies**
   - Manage in package.json
   - Use specific versions
   - Document requirements

3. **TypeScript**
   - Enable strict mode
   - Use type annotations
   - Document interfaces

4. **Version Control**
   - Commit .src.md files
   - Include package.json
   - Document setup steps

## Next Steps

- Explore the [File Format](./file-format.src.md) specification
- Check out more [Examples](./examples.src.md)
- Learn about [Features](./features.src.md)
- Join our [Discord](https://discord.gg/shDEGBSe2d)
- Watch tutorials on [YouTube](https://www.youtube.com/@srcbook)