<!-- srcbook:{"language":"typescript"} -->

# Advanced Cell Features in Srcbook

This notebook demonstrates advanced cell features in Srcbook, including output types, rich formatting, custom renderers, and cell dependencies.

## Setup

First, let's set up our environment:

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "marked": "^11.1.1",
    "mermaid": "^10.7.0",
    "katex": "^0.16.9"
  }
}
```

## Cell Output Types

Different types of cell outputs:

###### output-types.ts

```typescript
// Text output
console.log('Basic text output');

// JSON output
console.log(JSON.stringify({
  name: 'Example',
  values: [1, 2, 3]
}, null, 2));

// Table output
console.table([
  { id: 1, name: 'Item 1', value: 100 },
  { id: 2, name: 'Item 2', value: 200 },
  { id: 3, name: 'Item 3', value: 300 }
]);

// Error output
try {
  throw new Error('Example error output');
} catch (error) {
  console.error(error);
}

// Type assertions
type test1 = typeof console.log extends (message: any) => void ? true : false;
type test2 = typeof console.table extends (data: any) => void ? true : false;

const assertOutputs: [test1, test2] = [true, true];
```

## Rich Output Formatting

Format output with markdown and HTML:

###### rich-output.ts

```typescript
import { marked } from 'marked';

class RichOutput {
  static markdown(text: string): string {
    return marked(text);
  }
  
  static html(content: string): string {
    return content;
  }
  
  static table(data: unknown[]): string {
    const headers = Object.keys(data[0] ?? {});
    const rows = data.map(item => 
      headers.map(key => (item as any)[key])
    );
    
    return `
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(row => 
            `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
    `;
  }
}

// Example usage
const markdownOutput = RichOutput.markdown(`
# Example Header
- List item 1
- List item 2

\`\`\`typescript
const code = 'example';
\`\`\`
`);

const tableData = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' }
];
const tableOutput = RichOutput.table(tableData);

// Type assertions
type test3 = ReturnType<typeof RichOutput.markdown> extends string ? true : false;
type test4 = ReturnType<typeof RichOutput.table> extends string ? true : false;

const assertRich: [test3, test4] = [true, true];
```

## Custom Renderers

Create custom output renderers:

###### custom-renderers.ts

```typescript
interface Renderer<T> {
  render(data: T): string;
}

// Mermaid diagram renderer
class MermaidRenderer implements Renderer<string> {
  render(diagram: string): string {
    return `
      <div class="mermaid">
        ${diagram}
      </div>
    `;
  }
}

// Math equation renderer
class KaTeXRenderer implements Renderer<string> {
  render(equation: string): string {
    return `
      <div class="katex">
        ${equation}
      </div>
    `;
  }
}

// JSON tree renderer
class JsonTreeRenderer implements Renderer<unknown> {
  render(data: unknown): string {
    return `
      <div class="json-tree">
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </div>
    `;
  }
}

// Example usage
const mermaid = new MermaidRenderer();
const katex = new KaTeXRenderer();
const jsonTree = new JsonTreeRenderer();

const diagram = mermaid.render(`
  graph TD
    A[Start] --> B[Process]
    B --> C[End]
`);

const equation = katex.render('E = mc^2');

const data = jsonTree.render({
  name: 'Example',
  nested: {
    value: 42
  }
});

// Type assertions
type test5 = MermaidRenderer extends Renderer<string> ? true : false;
type test6 = KaTeXRenderer extends Renderer<string> ? true : false;
type test7 = JsonTreeRenderer extends Renderer<unknown> ? true : false;

const assertRenderers: [test5, test6, test7] = [true, true, true];
```

## Cell Metadata

Work with cell metadata:

###### metadata-types.ts

```typescript
interface CellMetadata {
  id: string;
  type: 'code' | 'markdown';
  language?: string;
  tags?: string[];
  dependencies?: string[];
  created: Date;
  modified: Date;
}

class MetadataManager {
  private metadata: Map<string, CellMetadata> = new Map();
  
  addMetadata(cellId: string, data: Omit<CellMetadata, 'id'>): void {
    this.metadata.set(cellId, {
      id: cellId,
      ...data
    });
  }
  
  getMetadata(cellId: string): CellMetadata | undefined {
    return this.metadata.get(cellId);
  }
  
  updateMetadata(cellId: string, updates: Partial<CellMetadata>): void {
    const current = this.metadata.get(cellId);
    if (current) {
      this.metadata.set(cellId, {
        ...current,
        ...updates,
        modified: new Date()
      });
    }
  }
}

// Type assertions
type test8 = MetadataManager extends { getMetadata(id: string): CellMetadata | undefined } ? true : false;
const assertMetadata: test8 = true;
```

## Cell Dependencies

Manage cell dependencies:

###### dependency-manager.ts

```typescript
interface DependencyNode {
  id: string;
  dependencies: Set<string>;
  dependents: Set<string>;
}

class DependencyManager {
  private nodes: Map<string, DependencyNode> = new Map();
  
  addCell(cellId: string): void {
    if (!this.nodes.has(cellId)) {
      this.nodes.set(cellId, {
        id: cellId,
        dependencies: new Set(),
        dependents: new Set()
      });
    }
  }
  
  addDependency(cellId: string, dependsOn: string): void {
    this.addCell(cellId);
    this.addCell(dependsOn);
    
    const cell = this.nodes.get(cellId)!;
    const dependency = this.nodes.get(dependsOn)!;
    
    cell.dependencies.add(dependsOn);
    dependency.dependents.add(cellId);
  }
  
  getExecutionOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      
      const node = this.nodes.get(nodeId)!;
      visited.add(nodeId);
      
      for (const depId of node.dependencies) {
        visit(depId);
      }
      
      order.push(nodeId);
    };
    
    for (const nodeId of this.nodes.keys()) {
      visit(nodeId);
    }
    
    return order;
  }
}

// Type assertions
type test9 = DependencyManager extends { getExecutionOrder(): string[] } ? true : false;
type test10 = DependencyNode extends { dependencies: Set<string> } ? true : false;

const assertDependencies: [test9, test10] = [true, true];
```

## Testing This Notebook

Run the tests:

```bash
npx tsx docs/testing/run-tests.ts docs/advanced/advanced-cells.src.md
```

The test harness will:
1. Verify output formatting
2. Test custom renderers
3. Check metadata handling
4. Validate dependency management

## Next Steps

- Explore [Error Handling](./error-handling.src.md)
- Learn about [Performance Optimization](./performance.src.md)
- Study [Interoperability](./interoperability.src.md)