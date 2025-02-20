<!-- srcbook:{"language":"typescript"} -->

# Web App Generator Architecture

This document explains the architecture of Srcbook's web app generator, including its components, interactions, and design principles.

## System Overview

The web app generator is built on several key components that work together:

###### system-components.ts

```typescript
interface SystemArchitecture {
  // Core Components
  components: {
    aiEngine: "Handles AI generation and modifications";
    projectManager: "Manages app lifecycle and state";
    fileSystem: "Handles file operations";
    packageManager: "Manages dependencies";
    gitIntegration: "Handles version control";
  };

  // Data Flow
  dataFlow: {
    input: "User prompt/request";
    processing: "AI generation/modification";
    output: "File changes/commands";
    feedback: "Real-time updates";
  };
}
```

## Component Architecture

### 1. AI Engine

The AI component handles code generation and modifications:

###### ai-engine.ts

```typescript
interface AIEngine {
  // Generation pipeline
  pipeline: {
    prompt: string;        // User request
    context: ProjectXML;   // Current project state
    response: PlanXML;     // Generated changes
  };

  // Response parsing
  interface PlanParser {
    parseActions(xml: string): Action[];
    validateChanges(actions: Action[]): boolean;
    applyChanges(actions: Action[]): Promise<void>;
  }

  // Change types
  type Action = 
    | { type: 'file'; path: string; content: string }
    | { type: 'command'; command: string };
}
```

### 2. Project Manager

Manages app lifecycle and state:

###### project-manager.ts

```typescript
interface ProjectManager {
  // App lifecycle
  interface AppLifecycle {
    createApp(name: string): Promise<App>;
    loadApp(id: string): Promise<App>;
    deleteApp(id: string): Promise<void>;
    updateApp(id: string, changes: Changes): Promise<void>;
  }

  // State management
  interface AppState {
    metadata: {
      id: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    };
    files: Map<string, FileContent>;
    dependencies: Map<string, string>;
  }

  // Event system
  interface AppEvents {
    onFileChange(callback: (file: FileChange) => void): void;
    onStateChange(callback: (state: AppState) => void): void;
    onError(callback: (error: AppError) => void): void;
  }
}
```

### 3. File System Manager

Handles file operations and watching:

###### file-system.ts

```typescript
interface FileSystem {
  // File operations
  interface FileOps {
    writeFile(path: string, content: string): Promise<void>;
    readFile(path: string): Promise<string>;
    deleteFile(path: string): Promise<void>;
    moveFile(from: string, to: string): Promise<void>;
  }

  // Directory operations
  interface DirOps {
    createDir(path: string): Promise<void>;
    readDir(path: string): Promise<DirEntry[]>;
    deleteDir(path: string): Promise<void>;
    moveDir(from: string, to: string): Promise<void>;
  }

  // File watching
  interface FileWatcher {
    watch(path: string): FileWatcherInstance;
    onFileChange(callback: (event: FileEvent) => void): void;
    stopWatching(path: string): void;
  }
}
```

### 4. Package Manager

Handles dependencies and scripts:

###### package-manager.ts

```typescript
interface PackageManager {
  // Dependency management
  interface DependencyManager {
    install(packages: string[]): Promise<void>;
    uninstall(packages: string[]): Promise<void>;
    update(packages: string[]): Promise<void>;
  }

  // Package.json management
  interface PackageJsonManager {
    read(): Promise<PackageJson>;
    write(content: PackageJson): Promise<void>;
    merge(updates: Partial<PackageJson>): Promise<void>;
  }

  // Script execution
  interface ScriptRunner {
    run(script: string): Promise<void>;
    runWithOutput(script: string): AsyncIterator<string>;
    stop(script: string): Promise<void>;
  }
}
```

### 5. Git Integration

Handles version control:

###### git-integration.ts

```typescript
interface GitIntegration {
  // Repository management
  interface RepoManager {
    init(): Promise<void>;
    clone(url: string): Promise<void>;
    checkout(branch: string): Promise<void>;
  }

  // Change tracking
  interface ChangeTracker {
    stage(files: string[]): Promise<void>;
    commit(message: string): Promise<void>;
    push(remote: string, branch: string): Promise<void>;
  }

  // History management
  interface HistoryManager {
    log(): Promise<GitLogEntry[]>;
    show(commit: string): Promise<GitCommit>;
    diff(from: string, to: string): Promise<GitDiff>;
  }
}
```

## Component Interactions

The components interact through well-defined interfaces:

###### interactions.ts

```typescript
interface ComponentInteractions {
  // AI to Project Manager
  interface AIToProject {
    applyChanges(plan: Plan): Promise<void>;
    validateChanges(plan: Plan): Promise<boolean>;
  }

  // Project Manager to File System
  interface ProjectToFS {
    writeChanges(changes: FileChange[]): Promise<void>;
    watchProject(id: string): Promise<void>;
  }

  // Package Manager to Project
  interface PackageToProject {
    updateDependencies(changes: DependencyChange[]): Promise<void>;
    runScripts(scripts: string[]): Promise<void>;
  }

  // Git to Project
  interface GitToProject {
    trackChanges(files: string[]): Promise<void>;
    createCommit(message: string): Promise<void>;
  }
}
```

## Next Steps

- Learn about [AI Integration](./ai-integration.src.md)
- Explore [Project Structure](./project-structure.src.md)
- Study [File System](./file-system.src.md)
- Understand [Package Management](./package-management.src.md)
