import { readFile } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import chalk from 'chalk';

// Validation schemas for the architectural components
const FileSystemSchema = z.object({
  writeFile: z.function().args(z.any(), z.any()),
  deleteFile: z.function().args(z.any(), z.string()),
  createDirectory: z.function().args(z.any(), z.string(), z.string()),
  deleteDirectory: z.function().args(z.any(), z.string()),
  loadDirectory: z.function().args(z.any(), z.string()),
  loadFile: z.function().args(z.any(), z.string()),
  createFile: z.function().args(z.any(), z.string(), z.string(), z.string()),
  renameFile: z.function().args(z.any(), z.string(), z.string()),
  renameDirectory: z.function().args(z.any(), z.string(), z.string()),
});

const AppLifecycleSchema = z.object({
  createApp: z.function(),
  createAppWithAi: z.function(),
  loadApp: z.function().args(z.string()),
  deleteApp: z.function().args(z.string()),
  updateApp: z.function().args(z.string(), z.object({ name: z.string() })),
  loadApps: z.function().args(z.union([z.literal('asc'), z.literal('desc')])),
});

const GitIntegrationSchema = z.object({
  initRepo: z.function(),
  commitAllFiles: z.function(),
});

interface ValidationResult {
  component: string;
  implemented: boolean;
  missingFeatures: string[];
  extraFeatures: string[];
  documentationPath: string;
  implementationPath: string;
}


export async function validateArchitecture(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Load documentation files
  try {
    const architectureDoc = await readFile(
      join(process.cwd(), '../../web-app-generator/architecture.src.md'),
      'utf-8',
    );
    console.log('Successfully read architecture.src.md');
  } catch (error) {
    console.error('Failed to read architecture.src.md:', error);
    return [];
  }

  // Validate File System
  import { writeFile, deleteFile, createDirectory, deleteDirectory, loadDirectory, loadFile, createFile, renameFile, renameDirectory } from '../../../../packages/api/apps/disk.mjs'; 

    const fileSystemImpl = {
      writeFile,
      deleteFile,
      createDirectory,
      deleteDirectory,
      loadDirectory,
      loadFile,
      createFile,
      renameFile,
      renameDirectory,
    };

    const validationResult = FileSystemSchema.safeParse(fileSystemImpl);

    results.push({
      component: 'FileSystem',
      implemented: validationResult.success,
      missingFeatures: validationResult.success ? [] : ['Type validation failed'],
      extraFeatures: [
        'createZipFromApp',
        'getFlatFilesForApp',
        'toFileType',
        'fileUpdated',
        'broadcastFileUpdated',
      ],
      documentationPath: 'docs/web-app-generator/file-system.src.md',
      implementationPath: 'packages/api/apps/disk.mts',
    });
  } catch (error) {
    console.error('Failed to validate FileSystem:', error);
    results.push({
      component: 'FileSystem',
      implemented: false,
      missingFeatures: ['Implementation not found or failed to load'],
      extraFeatures: [],
      documentationPath: 'docs/web-app-generator/file-system.src.md',
      implementationPath: 'packages/api/apps/disk.mts',
    });
    return results;
  }

  // Validate App Lifecycle
  try {
    const { createApp, createAppWithAi, loadApp, deleteApp, updateApp, loadApps } = await import(
      '../../../../packages/api/apps/app.mjs'
    );

    const appLifecycleImpl = {
      createApp,
      createAppWithAi,
      loadApp,
      deleteApp,
      updateApp,
      loadApps,
    };

    const validationResult = AppLifecycleSchema.safeParse(appLifecycleImpl);

    results.push({
      component: 'AppLifecycle',
      implemented: validationResult.success,
      missingFeatures: validationResult.success ? [] : ['Type validation failed'],
      extraFeatures: ['createAppWithAi', 'loadApps', 'serializeApp'],
      documentationPath: 'docs/web-app-generator/architecture.src.md',
      implementationPath: 'packages/api/apps/app.mts',
    });
  } catch (error) {
    console.error('Failed to validate AppLifecycle:', error);
    results.push({
      component: 'AppLifecycle',
      implemented: false,
      missingFeatures: ['Implementation not found or failed to load'],
      extraFeatures: [],
      documentationPath: 'docs/web-app-generator/architecture.src.md',
      implementationPath: 'packages/api/apps/app.mts',
    });
  }

  // Validate Git Integration
  try {
    const { initRepo, commitAllFiles } = await import('../../../../packages/api/apps/git.mjs');

    const gitImpl = {
      initRepo,
      commitAllFiles,
    };

    const validationResult = GitIntegrationSchema.safeParse(gitImpl);

    results.push({
      component: 'GitIntegration',
      implemented: validationResult.success,
      missingFeatures: ['clone', 'checkout', 'stage', 'push', 'log', 'show', 'diff'],
      extraFeatures: [],
      documentationPath: 'docs/web-app-generator/architecture.src.md',
      implementationPath: 'packages/api/apps/git.mts',
    });
  } catch (error) {
    console.error('Failed to validate GitIntegration:', error);
    results.push({
      component: 'GitIntegration',
      implemented: false,
      missingFeatures: ['Implementation not found or failed to load'],
      extraFeatures: [],
      documentationPath: 'docs/web-app-generator/architecture.src.md',
      implementationPath: 'packages/api/apps/git.mts',
    });
  }

  return results;
}

export function reportValidation(results: ValidationResult[]) {
  console.log('\nArchitecture Validation Results:');
  console.log('===============================\n');

  for (const result of results) {
    console.log(chalk.bold(result.component));
    console.log('Documentation:', result.documentationPath);
    console.log('Implementation:', result.implementationPath);
    console.log(
      'Status:',
      result.implemented ? chalk.green('✓ Implemented') : chalk.red('✗ Not fully implemented'),
    );

    if (result.missingFeatures.length > 0) {
      console.log(chalk.yellow('\nMissing features:'));
      for (const feature of result.missingFeatures) {
        console.log(`  - ${feature}`);
      }
    }

    if (result.extraFeatures.length > 0) {
      console.log(chalk.blue('\nExtra features:'));
      for (const feature of result.extraFeatures) {
        console.log(`  + ${feature}`);
      }
    }

    console.log('\n---\n');
  }

  // Summary
  const totalComponents = results.length;
  const implementedComponents = results.filter((r) => r.implemented).length;
  const missingFeatures = results.reduce((sum, r) => sum + r.missingFeatures.length, 0);
  const extraFeatures = results.reduce((sum, r) => sum + r.extraFeatures.length, 0);

  console.log(chalk.bold('\nSummary:'));
  console.log(`Total Components: ${totalComponents}`);
  console.log(`Fully Implemented: ${implementedComponents}`);
  console.log(`Missing Features: ${missingFeatures}`);
  console.log(`Extra Features: ${extraFeatures}`);

  // Documentation Recommendations
  if (missingFeatures > 0 || extraFeatures > 0) {
    console.log(chalk.bold('\nRecommendations:'));
    if (missingFeatures > 0) {
      console.log(chalk.yellow('- Update documentation to remove unimplemented features'));
    }
    if (extraFeatures > 0) {
      console.log(chalk.blue('- Document additional implemented features'));
    }
  }
}

// Run validation if this file is executed directly
if (process.argv[1] === import.meta.url) {
  (async () => {
    try {
      const results = await validateArchitecture();
      reportValidation(results);

      // Exit with error if any components are not fully implemented
      const hasFailures = results.some((r) => !r.implemented || r.missingFeatures.length > 0);
      process.exit(hasFailures ? 1 : 0);
    } catch (error) {
      console.error('Validation failed:', error);
      process.exit(1);
    }
  })();
}
