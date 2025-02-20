<!-- srcbook:{"language":"typescript"} -->

# Package Management in Web App Generator

This document explains how Srcbook's web app generator manages packages and dependencies.

## Overview

The package manager handles dependencies and project scripts:

###### package-manager.ts

```typescript
interface PackageManager {
  // Core functionality
  interface Core {
    install(packages: string[]): Promise<void>;
    uninstall(packages: string[]): Promise<void>;
    update(packages: string[]): Promise<void>;
    runScript(script: string): Promise<void>;
  }

  // Package types
  type PackageType = 
    | 'dependency'
    | 'devDependency'
    | 'peerDependency'
    | 'optionalDependency';
}
```

## Dependency Management

Handles package installation and updates:

###### dependency-manager.ts

```typescript
interface DependencyManager {
  // Installation options
  interface InstallOptions {
    dev?: boolean;
    exact?: boolean;
    peer?: boolean;
    optional?: boolean;
    global?: boolean;
  }

  // Version management
  interface VersionManager {
    resolveVersion(pkg: string): Promise<string>;
    checkUpdates(packages: string[]): Promise<Updates>;
    validateVersion(version: string): boolean;
  }

  // Dependency resolution
  interface DependencyResolver {
    resolveDependencies(pkg: string): Promise<string[]>;
    checkConflicts(packages: string[]): Promise<Conflict[]>;
    suggestAlternatives(pkg: string): Promise<string[]>;
  }
}
```

## Package.json Management

Manages the package.json file:

###### package-json-manager.ts

```typescript
interface PackageJsonManager {
  // File operations
  interface FileOps {
    read(): Promise<PackageJson>;
    write(content: PackageJson): Promise<void>;
    update(updates: Partial<PackageJson>): Promise<void>;
  }

  // Content management
  interface ContentManager {
    addDependency(name: string, version: string): Promise<void>;
    removeDependency(name: string): Promise<void>;
    addScript(name: string, command: string): Promise<void>;
    updateScript(name: string, command: string): Promise<void>;
  }

  // Validation
  interface Validator {
    validatePackageJson(content: unknown): boolean;
    checkRequiredFields(): Promise<boolean>;
    validateScripts(): Promise<boolean>;
  }
}
```

## Script Management

Handles npm scripts:

###### script-manager.ts

```typescript
interface ScriptManager {
  // Script execution
  interface ScriptRunner {
    run(script: string): Promise<void>;
    runWithEnv(script: string, env: NodeJS.ProcessEnv): Promise<void>;
    runParallel(scripts: string[]): Promise<void>;
    runSequential(scripts: string[]): Promise<void>;
  }

  // Script output
  interface ScriptOutput {
    onStdout(callback: (data: string) => void): void;
    onStderr(callback: (data: string) => void): void;
    onExit(callback: (code: number) => void): void;
    getOutput(): Promise<string>;
  }

  // Process management
  interface ProcessManager {
    kill(script: string): Promise<void>;
    isRunning(script: string): boolean;
    listRunning(): Promise<string[]>;
  }
}
```

## Lock File Management

Handles package lock files:

###### lock-file-manager.ts

```typescript
interface LockFileManager {
  // Lock file operations
  interface LockFileOps {
    read(): Promise<LockFile>;
    write(content: LockFile): Promise<void>;
    update(changes: LockFileChanges): Promise<void>;
  }

  // Version locking
  interface VersionLocker {
    lockVersion(pkg: string, version: string): Promise<void>;
    unlockVersion(pkg: string): Promise<void>;
    getLocked(pkg: string): Promise<string | null>;
  }

  // Integrity checking
  interface IntegrityChecker {
    checkIntegrity(): Promise<boolean>;
    validateHashes(): Promise<boolean>;
    repairLockFile(): Promise<void>;
  }
}
```

## Cache Management

Manages npm cache:

###### cache-manager.ts

```typescript
interface CacheManager {
  // Cache operations
  interface CacheOps {
    clean(): Promise<void>;
    verify(): Promise<boolean>;
    add(pkg: string, version: string): Promise<void>;
    remove(pkg: string): Promise<void>;
  }

  // Cache info
  interface CacheInfo {
    getCacheSize(): Promise<number>;
    listCached(): Promise<CachedPackage[]>;
    getCacheLocation(): string;
  }

  // Cache configuration
  interface CacheConfig {
    setCacheLocation(path: string): void;
    setMaxSize(size: number): void;
    getConfig(): CacheSettings;
  }
}
```

## Usage Examples

### Basic Package Management

```typescript
// Initialize package manager
const pm = new PackageManager();

// Install dependencies
await pm.install(['react', 'react-dom'], { dev: false });
await pm.install(['typescript', '@types/react'], { dev: true });

// Update package.json
await pm.updatePackageJson({
  name: 'my-app',
  version: '1.0.0',
  scripts: {
    dev: 'vite',
    build: 'tsc && vite build',
    preview: 'vite preview'
  }
});

// Run scripts
await pm.runScript('build');
```

### Advanced Operations

```typescript
// Parallel script execution
await pm.runParallel([
  'watch:ts',
  'watch:css',
  'dev-server'
]);

// Lock file management
const lockFile = await pm.readLockFile();
await pm.updateLockFile({
  dependencies: {
    'react': {
      version: '18.2.0',
      resolved: 'https://registry.npmjs.org/react/-/react-18.2.0.tgz'
    }
  }
});

// Cache operations
await pm.cleanCache();
await pm.verifyCache();
```

## Next Steps

- Study [Examples](./examples.src.md)
- Learn about [Error Handling](./error-handling.src.md)
- Explore [Project Structure](./project-structure.src.md)