<!-- srcbook:{"language":"typescript"} -->

# Srcbook File Format (.src.md)

Srcbook uses a specialized markdown format (.src.md) that combines literate programming with executable code cells. This document explains the format specification.

## File Structure

A .src.md file consists of:
1. Metadata header (required)
2. Title (required)
3. Content cells (markdown and code)

### Metadata Header

Every .src.md file must begin with a metadata comment specifying at minimum the language:

###### metadata-example.src.md

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

Optional metadata fields:
- tsconfig.json: TypeScript configuration
- other configuration as needed

### Title

Each .src.md file must have exactly one h1 (#) heading that serves as the title:

###### title-example.src.md

```markdown
# My Srcbook Title
```

### Content Cells

#### Markdown Cells

Regular markdown content is treated as markdown cells. You can use all standard markdown features:
- Headers (h2-h6)
- Lists
- Links
- Code blocks
- etc.

#### Code Cells

Code cells are defined by:
1. An h6 (###### ) heading containing the filename
2. A code block with the source code

Example:

###### hello.ts

```typescript
// This is a code cell
console.log("Hello from a code cell!");
```

#### Package.json Cell

A special code cell named package.json can define dependencies:

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

### Cell Features

#### Code Cell Properties
- Filename determines the language (e.g., .ts, .js)
- Code is executed in Node.js environment
- Cells can import from other cells
- Cells can use npm dependencies
- TypeScript cells are type-checked

#### Markdown Cell Properties
- Support for all CommonMark syntax
- Support for GFM (tables, task lists)
- Support for mermaid diagrams
- Math equations via KaTeX

## Example

Here's a complete example of a .src.md file:

###### complete-example.src.md

```markdown
<!-- srcbook:{"language":"typescript"} -->

# Example Srcbook

This is a markdown cell explaining the code below.

###### greeter.ts

```typescript
interface Person {
  name: string;
}

function greet(person: Person) {
  return `Hello, ${person.name}!`;
}

console.log(greet({ name: "World" }));
```

More markdown content here...
```

## File Export/Import

Srcbooks can be:
- Exported to .src.md files
- Imported from .src.md files
- Shared and version controlled
- Rendered by any markdown viewer
- Executed in Srcbook environment

## Best Practices

1. Use descriptive filenames for code cells
2. Include package.json when using dependencies
3. Document code with markdown cells
4. Use TypeScript for type safety
5. Follow literate programming principles
6. Keep code cells focused and modular
7. Use mermaid for diagrams when helpful

## Technical Details

The .src.md format is parsed using:
- marked for markdown parsing
- Custom token grouping for cell identification
- Validation for format requirements
- TypeScript/JavaScript for code execution