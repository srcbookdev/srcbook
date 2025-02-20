<!-- srcbook:{"language":"typescript"} -->

# Srcbook Web App Generator

Welcome to the documentation for Srcbook's web app generator. This section explains how to use and understand the AI-powered web app generation capabilities.

## Overview

The web app generator is a powerful feature that allows you to:
- Create new web applications from natural language descriptions
- Modify existing applications through AI assistance
- Generate fully functional React + TypeScript + Vite applications
- Manage dependencies and project structure automatically

## Quick Links

- [Architecture](./architecture.src.md) - System design and components
- [AI Integration](./ai-integration.src.md) - How AI generates and modifies code
- [Project Structure](./project-structure.src.md) - Generated app organization
- [File System](./file-system.src.md) - How files are managed
- [Package Management](./package-management.src.md) - Dependency handling
- [Examples](./examples.src.md) - Real-world usage examples

## Basic Usage

Here's a simple example of creating a new app:

###### example-usage.ts

```typescript
// 1. Create a new app
const app = await createApp({
  name: "todo-app",
  prompt: "Create a todo list app with local storage"
});

// 2. The generator will:
// - Set up a Vite + React + TypeScript project
// - Create necessary components and files
// - Install required dependencies
// - Initialize Git repository

// 3. You can then modify the app:
await editApp(app.id, {
  prompt: "Add dark mode support"
});
```

## Key Features

1. **AI-Powered Generation**
   - Natural language prompts
   - Context-aware modifications
   - Best practices enforcement

2. **Modern Stack**
   - React for UI
   - TypeScript for type safety
   - Vite for development
   - Tailwind for styling

3. **Project Management**
   - Automatic dependency installation
   - Git integration
   - File system operations
   - Real-time updates

4. **Development Experience**
   - Hot module replacement
   - Type checking
   - Modern tooling
   - Component organization

## Next Steps

- Read [Architecture](./architecture.src.md) to understand the system
- Try [Examples](./examples.src.md) to see it in action
- Learn about [AI Integration](./ai-integration.src.md) for advanced usage