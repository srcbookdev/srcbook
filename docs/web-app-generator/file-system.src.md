<!-- srcbook:{"language":"typescript"} -->

# File System Operations in Web App Generator

This document explains how Srcbook's web app generator manages files and directories.

## Overview

The file system manager handles all file operations:

###### file-manager.ts

```typescript
interface FileManager {
  // Core operations
  interface Operations {
    createFile(path: string, content: string): Promise<void>;
    readFile(path: string): Promise<string>;
    updateFile(path: string, content: string): Promise<void>;
    deleteFile(path: string): Promise<void>;
    moveFile(from: string, to: string): Promise<void>;
  }

  // Directory operations
  interface DirectoryOps {
    createDir(path: string): Promise<void>;
    readDir(path: string): Promise<DirEntry[]>;
    deleteDir(path: string): Promise<void>;
    moveDir(from: string, to: string): Promise<void>;
  }
}
```

## Path Management

Handles path resolution and validation:

###### path-manager.ts

```typescript
interface PathManager {
  // Path resolution
  interface PathResolver {
    resolvePath(path: string): string;
    relativePath(from: string, to: string): string;
    absolutePath(path: string): string;
  }

  // Path validation
  interface PathValidator {
    isValidPath(path: string): boolean;
    isWithinRoot(path: string): boolean;
    normalizePath(path: string): string;
  }

  // Path utilities
  interface PathUtils {
    dirname(path: string): string;
    basename(path: string): string;
    extname(path: string): string;
    join(...paths: string[]): string;
  }
}
```

## File Operations

Detailed file operation implementations:

###### file-operations.ts

```typescript
interface FileOperations {
  // File writing
  interface FileWriter {
    writeText(path: string, content: string): Promise<void>;
    writeBinary(path: string, content: Buffer): Promise<void>;
    writeJSON(path: string, data: unknown): Promise<void>;
  }

  // File reading
  interface FileReader {
    readText(path: string): Promise<string>;
    readBinary(path: string): Promise<Buffer>;
    readJSON<T>(path: string): Promise<T>;
  }

  // File updates
  interface FileUpdater {
    updateText(path: string, content: string): Promise<void>;
    updateJSON(path: string, updates: object): Promise<void>;
    patch(path: string, patches: FilePatch[]): Promise<void>;
  }
}
```

## Directory Management

Handles directory operations:

###### directory-manager.ts

```typescript
interface DirectoryManager {
  // Directory creation
  interface DirectoryCreator {
    createDirectory(path: string): Promise<void>;
    createNestedDirectories(paths: string[]): Promise<void>;
    ensureDirectory(path: string): Promise<void>;
  }

  // Directory reading
  interface DirectoryReader {
    readDirectory(path: string): Promise<DirEntry[]>;
    readRecursive(path: string): Promise<DirEntry[]>;
    findFiles(pattern: string): Promise<string[]>;
  }

  // Directory cleanup
  interface DirectoryCleaner {
    deleteDirectory(path: string): Promise<void>;
    cleanDirectory(path: string): Promise<void>;
    removeEmptyDirs(path: string): Promise<void>;
  }
}
```

## File Watching

Monitors file system changes:

###### file-watcher.ts

```typescript
interface FileWatcher {
  // Watch configuration
  interface WatchConfig {
    paths: string[];
    ignore: string[];
    persistent: boolean;
    recursive: boolean;
  }

  // Event handling
  interface WatchEvents {
    onCreated(callback: (path: string) => void): void;
    onModified(callback: (path: string) => void): void;
    onDeleted(callback: (path: string) => void): void;
    onRenamed(callback: (oldPath: string, newPath: string) => void): void;
  }

  // Watch control
  interface WatchControl {
    startWatching(config: WatchConfig): void;
    stopWatching(path?: string): void;
    isWatching(path: string): boolean;
  }
}
```

## File Types

Handles different file types:

###### file-types.ts

```typescript
interface FileTypes {
  // File type detection
  interface TypeDetector {
    getFileType(path: string): FileType;
    isBinaryFile(path: string): boolean;
    getEncoding(path: string): string;
  }

  // File categories
  type FileType =
    | { type: 'text'; encoding: string }
    | { type: 'binary' }
    | { type: 'symlink'; target: string };

  // File extensions
  const TEXT_EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx',
    '.css', '.html', '.json', '.md'
  ];

  const BINARY_EXTENSIONS = [
    '.jpg', '.png', '.gif', '.pdf',
    '.zip', '.tar', '.gz'
  ];
}
```

## Error Handling

Handles file system errors:

###### error-handling.ts

```typescript
interface FSErrorHandling {
  // Error types
  type FSError =
    | { type: 'not_found'; path: string }
    | { type: 'permission_denied'; path: string }
    | { type: 'already_exists'; path: string }
    | { type: 'io_error'; error: Error };

  // Error recovery
  interface ErrorRecovery {
    handleError(error: FSError): Promise<void>;
    retryOperation(op: () => Promise<void>): Promise<void>;
    rollback(changes: FileChange[]): Promise<void>;
  }

  // Error reporting
  interface ErrorReporting {
    logError(error: FSError): void;
    notifyUser(error: FSError): void;
    collectMetrics(error: FSError): void;
  }
}
```

## Usage Examples

### Basic File Operations

```typescript
// Initialize file system
const fs = new FileSystem();

// Create and write files
await fs.createFile('src/App.tsx', content);
await fs.createDirectory('src/components');

// Read and update
const content = await fs.readFile('src/App.tsx');
await fs.updateFile('src/App.tsx', newContent);

// Watch for changes
fs.watch('src', {
  onModified: (path) => {
    console.log(`File changed: ${path}`);
  }
});
```

### Advanced Operations

```typescript
// Recursive operations
await fs.createNestedDirectories([
  'src/components',
  'src/hooks',
  'src/utils'
]);

// Find files
const tsFiles = await fs.findFiles('src/**/*.ts');

// Clean up
await fs.cleanDirectory('dist');
await fs.removeEmptyDirs('src');
```

## Next Steps

- Explore [Package Management](./package-management.src.md)
- Study [Examples](./examples.src.md)
- Learn about [Error Handling](./error-handling.src.md)