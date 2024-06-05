import Path from 'node:path';
import fs from 'node:fs/promises';
import { exec } from 'node:child_process';

export async function shouldNpmInstall(dirPath: string): Promise<boolean> {
  const packageJsonPath = Path.resolve(Path.join(dirPath, 'package.json'));
  const packageLockPath = Path.resolve(Path.join(dirPath, 'package-lock.json'));

  const packageJsonExists = await fileExists(packageJsonPath);

  if (!packageJsonExists) {
    throw new Error(`No package.json was found in ${dirPath}`);
  }

  const packageJsonData = await fs.readFile(packageJsonPath, 'utf8');
  const pkgJson = JSON.parse(packageJsonData);

  const dependencies = pkgJson.dependencies || {};
  const devDependencies = pkgJson.devDependencies || {};

  const allDeps = { ...dependencies, ...devDependencies };
  const allDepsKeys = Object.keys(allDeps);

  if (allDepsKeys.length === 0) {
    return false; // No dependencies to install
  }

  const packageLockExists = await fileExists(packageLockPath);

  if (!packageLockExists) {
    return true; // package-lock.json does not exist, need to run npm install
  }

  const packageLockData = await fs.readFile(packageLockPath, 'utf8');
  const pkgLockJson = JSON.parse(packageLockData);

  const installedDeps = pkgLockJson.packages['']?.dependencies || {};

  for (const dep of allDepsKeys) {
    if (!installedDeps[dep]) {
      return true; // Dependency in package.json not found in package-lock.json
    }
  }
  return false; // All dependencies are installed
}

export async function missingUndeclaredDeps(dirPath: string): Promise<string[]> {
  return new Promise((resolve) => {
    // Ignore the err argument because depcheck exists with a non zero code (255) when there are missing deps.
    exec(`npm run depcheck ${Path.resolve(dirPath)} -- --json`, (_err, stdout) => {
      const output = stdout || '';

      // Use regex to extract JSON object
      const jsonMatch = output.match(/{.*}/s);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from depcheck output');
      }

      // Parse the JSON
      const parsedResult = JSON.parse(jsonMatch[0]);

      // Process and return the data as needed
      resolve(Object.keys(parsedResult.missing));
    });
  });
}

async function fileExists(filepath: string) {
  try {
    await fs.access(filepath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}
