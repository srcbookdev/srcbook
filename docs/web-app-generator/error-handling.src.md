<!-- srcbook:{"language":"typescript"} -->

# Error Handling in Web App Generator

This document explains how Srcbook's web app generator handles errors and provides recovery mechanisms.

## Error Types

The system handles various types of errors:

###### error-types.ts

```typescript
interface ErrorTypes {
  // Generation errors
  type GenerationError =
    | { type: 'invalid_prompt'; message: string }
    | { type: 'ai_error'; message: string }
    | { type: 'validation_failed'; issues: string[] };

  // File system errors
  type FSError =
    | { type: 'file_not_found'; path: string }
    | { type: 'permission_denied'; path: string }
    | { type: 'disk_full'; path: string };

  // Package errors
  type PackageError =
    | { type: 'install_failed'; package: string }
    | { type: 'dependency_conflict'; packages: string[] }
    | { type: 'version_mismatch'; details: VersionMismatch };

  // Runtime errors
  type RuntimeError =
    | { type: 'build_failed'; message: string }
    | { type: 'type_error'; location: string }
    | { type: 'runtime_exception'; error: Error };
}
```

## Error Recovery

Implements recovery strategies:

###### error-recovery.ts

```typescript
interface ErrorRecovery {
  // Recovery strategies
  interface RecoveryStrategies {
    handleGenerationError(error: GenerationError): Promise<void>;
    handleFSError(error: FSError): Promise<void>;
    handlePackageError(error: PackageError): Promise<void>;
    handleRuntimeError(error: RuntimeError): Promise<void>;
  }

  // Rollback mechanisms
  interface RollbackMechanisms {
    rollbackFileChanges(changes: FileChange[]): Promise<void>;
    rollbackPackageChanges(changes: PackageChange[]): Promise<void>;
    restoreBackup(backup: Backup): Promise<void>;
  }

  // State recovery
  interface StateRecovery {
    saveCheckpoint(): Promise<Checkpoint>;
    restoreCheckpoint(checkpoint: Checkpoint): Promise<void>;
    getLastStableState(): Promise<AppState>;
  }
}
```

## Error Reporting

Handles error reporting and logging:

###### error-reporting.ts

```typescript
interface ErrorReporting {
  // Error logging
  interface ErrorLogger {
    logError(error: Error, context: Context): void;
    logWarning(warning: Warning, context: Context): void;
    logDiagnostic(diagnostic: Diagnostic): void;
  }

  // User notifications
  interface UserNotifications {
    notifyError(error: Error): void;
    notifyWarning(warning: Warning): void;
    notifyRecovery(recovery: Recovery): void;
  }

  // Error analytics
  interface ErrorAnalytics {
    trackError(error: Error): void;
    analyzeErrorPatterns(): ErrorPatterns;
    generateErrorReport(): ErrorReport;
  }
}
```

## Error Prevention

Implements preventive measures:

###### error-prevention.ts

```typescript
interface ErrorPrevention {
  // Validation
  interface Validation {
    validateUserInput(input: unknown): boolean;
    validateFileChanges(changes: FileChange[]): boolean;
    validateDependencies(deps: Dependency[]): boolean;
  }

  // Safety checks
  interface SafetyChecks {
    checkDiskSpace(): Promise<boolean>;
    checkPermissions(path: string): Promise<boolean>;
    checkNetworkConnectivity(): Promise<boolean>;
  }

  // Type checking
  interface TypeChecking {
    typeCheckFile(path: string): Promise<TypeCheckResult>;
    validateTypes(changes: FileChange[]): Promise<boolean>;
    generateTypeDefinitions(): Promise<void>;
  }
}
```

## Usage Examples

### Handling Generation Errors

```typescript
// Error handling during app generation
try {
  const app = await generator.createApp({
    name: "my-app",
    prompt: "Create a todo app"
  });
} catch (error) {
  if (error.type === 'invalid_prompt') {
    // Handle invalid prompt
    await errorHandler.handleGenerationError(error);
  } else if (error.type === 'ai_error') {
    // Handle AI service error
    await errorHandler.retryGeneration();
  }
}

// With recovery
const errorHandler = new ErrorHandler();
errorHandler.onError(async (error) => {
  // Save current state
  const checkpoint = await errorHandler.saveCheckpoint();

  try {
    // Attempt recovery
    await errorHandler.recover(error);
  } catch (recoveryError) {
    // Restore checkpoint if recovery fails
    await errorHandler.restoreCheckpoint(checkpoint);
  }
});
```

### File System Error Handling

```typescript
// File system error handling
try {
  await fs.writeFile('src/App.tsx', content);
} catch (error) {
  if (error.type === 'disk_full') {
    // Clean up temporary files
    await fs.cleanTemp();
    // Retry operation
    await fs.writeFile('src/App.tsx', content);
  } else if (error.type === 'permission_denied') {
    // Request elevated permissions
    await fs.requestPermissions();
  }
}

// With automatic retry
const fs = new FileSystem({
  retryOptions: {
    maxAttempts: 3,
    delayMs: 1000,
    backoff: 'exponential'
  }
});

await fs.writeWithRetry('src/App.tsx', content);
```

### Package Management Errors

```typescript
// Package installation error handling
try {
  await pm.install(['react', 'react-dom']);
} catch (error) {
  if (error.type === 'dependency_conflict') {
    // Resolve conflicts
    const resolution = await pm.resolveConflicts(error.packages);
    await pm.install(resolution);
  } else if (error.type === 'version_mismatch') {
    // Update dependencies
    await pm.updateDependencies(error.details);
  }
}

// With dependency resolution
const pm = new PackageManager({
  resolutionStrategy: 'semver',
  conflictResolution: 'auto'
});

await pm.installSafely(['react', 'react-dom']);
```

## Next Steps

- Study [Examples](./examples.src.md)
- Learn about [Project Structure](./project-structure.src.md)
- Explore [Package Management](./package-management.src.md)