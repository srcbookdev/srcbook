<!-- srcbook:{"language":"typescript"} -->

# AI Integration in Web App Generator

This document explains how Srcbook's web app generator integrates with AI to create and modify web applications.

## AI System Overview

The AI integration consists of several key components:

###### ai-system.ts

```typescript
interface AISystem {
  // Core components
  components: {
    promptEngine: "Handles prompt construction";
    responseParser: "Parses AI responses";
    planExecutor: "Executes generated plans";
    contextManager: "Manages project context";
  };

  // Workflow
  workflow: {
    input: "User request";
    context: "Project state";
    generation: "AI response";
    validation: "Plan verification";
    execution: "Change application";
  };
}
```

## Prompt System

The generator uses specialized prompts for different operations:

### App Creation Prompt

###### app-creation-prompt.ts

```typescript
interface AppCreationPrompt {
  // System prompt
  systemPrompt: `
    You are helping build a front-end website application.
    Behave like a senior engineer and designer.
    Stack: React, Vite, TypeScript, Tailwind
    Goal: Create functional MVP
  `;

  // User request format
  userRequest: `
    <userRequest>
      Build a todo list app with local storage
    </userRequest>
  `;

  // Project context
  projectContext: `
    <project id="todo-app">
      <file filename="package.json">...</file>
      <file filename="src/App.tsx">...</file>
    </project>
  `;
}
```

### App Modification Prompt

###### app-modification-prompt.ts

```typescript
interface AppModificationPrompt {
  // System prompt
  systemPrompt: `
    You are helping modify an existing web application.
    Make targeted changes while maintaining code quality.
    Preserve existing patterns and structure.
  `;

  // User request with context
  userRequest: `
    <userRequest>
      Add dark mode support
    </userRequest>
    
    <project id="todo-app">
      [Current project files...]
    </project>
  `;
}
```

## Response Processing

The AI responses are processed through a structured pipeline:

###### response-processing.ts

```typescript
interface ResponseProcessing {
  // XML response format
  interface PlanFormat {
    planDescription: string;
    actions: Array<FileAction | CommandAction>;
  }

  // Action types
  type FileAction = {
    type: 'file';
    filename: string;
    content: string;
    description: string;
  };

  type CommandAction = {
    type: 'command';
    command: 'npm install';
    packages: string[];
    description: string;
  };

  // Response validation
  interface ResponseValidator {
    validatePlan(plan: PlanFormat): ValidationResult;
    checkFileActions(actions: FileAction[]): boolean;
    checkCommandActions(actions: CommandAction[]): boolean;
  }
}
```

## Plan Execution

Generated plans are executed through a managed pipeline:

###### plan-execution.ts

```typescript
interface PlanExecution {
  // Execution phases
  phases: {
    preparation: "Validate and prepare changes";
    fileSystem: "Apply file changes";
    dependencies: "Install packages";
    commands: "Run additional commands";
    verification: "Verify changes";
  };

  // Change application
  interface ChangeApplier {
    applyFileChanges(files: FileAction[]): Promise<void>;
    applyCommands(commands: CommandAction[]): Promise<void>;
    rollback(error: Error): Promise<void>;
  }

  // Result verification
  interface ChangeVerifier {
    verifyFiles(changes: FileAction[]): Promise<boolean>;
    verifyDependencies(packages: string[]): Promise<boolean>;
    verifyBuild(): Promise<boolean>;
  }
}
```

## Context Management

The system maintains context for better AI responses:

###### context-management.ts

```typescript
interface ContextManagement {
  // Project context
  interface ProjectContext {
    files: Map<string, string>;
    dependencies: Map<string, string>;
    structure: ProjectStructure;
  }

  // Context building
  interface ContextBuilder {
    buildContext(app: App): ProjectContext;
    serializeContext(context: ProjectContext): string;
    updateContext(context: ProjectContext, changes: Changes): ProjectContext;
  }

  // Context optimization
  interface ContextOptimizer {
    pruneContext(context: ProjectContext): ProjectContext;
    prioritizeFiles(context: ProjectContext): string[];
    summarizeChanges(changes: Changes): string;
  }
}
```

## Error Handling

The AI system includes robust error handling:

###### error-handling.ts

```typescript
interface AIErrorHandling {
  // Error types
  type AIError =
    | { type: 'invalid_response'; message: string }
    | { type: 'validation_failed'; issues: string[] }
    | { type: 'execution_failed'; error: Error }
    | { type: 'context_error'; context: string };

  // Error recovery
  interface ErrorRecovery {
    handleError(error: AIError): Promise<void>;
    retryGeneration(context: ProjectContext): Promise<void>;
    rollbackChanges(changes: Changes): Promise<void>;
  }

  // Error reporting
  interface ErrorReporting {
    logError(error: AIError): void;
    notifyUser(error: AIError): void;
    collectMetrics(error: AIError): void;
  }
}
```

## Usage Examples

### Creating a New App

```typescript
// Initialize AI system
const ai = new AISystem();

// Generate new app
const result = await ai.generateApp({
  prompt: "Create a todo list app with local storage",
  stack: {
    framework: "react",
    language: "typescript",
    styling: "tailwind"
  }
});

// Apply changes
await result.applyChanges();
```

### Modifying an App

```typescript
// Load existing app context
const context = await ai.loadContext("app-id");

// Generate modifications
const changes = await ai.generateChanges({
  context,
  prompt: "Add dark mode support"
});

// Validate and apply changes
if (await changes.validate()) {
  await changes.apply();
}
```

## Next Steps

- Explore [Project Structure](./project-structure.src.md)
- Learn about [File System](./file-system.src.md)
- Study [Package Management](./package-management.src.md)