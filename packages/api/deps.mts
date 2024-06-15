import Path from 'node:path';
import { exec } from 'node:child_process';
import { readFile } from './fs-utils.mjs';
import { DIST_DIR } from './constants.mjs';

export async function shouldNpmInstall(dirPath: string): Promise<boolean> {
  const packageJsonPath = Path.resolve(Path.join(dirPath, 'package.json'));
  const packageLockPath = Path.resolve(Path.join(dirPath, 'package-lock.json'));

  const [packageJsonResult, packageLockResult] = await Promise.all([
    readFile(packageJsonPath),
    readFile(packageLockPath),
  ]);

  if (!packageJsonResult.exists) {
    throw new Error(`No package.json was found in ${dirPath}`);
  }

  const pkgJson = JSON.parse(packageJsonResult.contents);
  const dependencies = Object.keys(pkgJson.dependencies || {});
  const devDependencies = Object.keys(pkgJson.devDependencies || {});

  // No dependencies == nothing to do
  if (dependencies.length === 0 && devDependencies.length === 0) {
    return false;
  }

  // Dependencies but no lock file == needs install
  if (!packageLockResult.exists) {
    return true;
  }

  const pkgLock = JSON.parse(packageLockResult.contents);
  const lockDependencies = pkgLock.packages['']?.dependencies || {};
  const lockDevDependencies = pkgLock.packages['']?.devDependencies || {};

  for (const dep of dependencies) {
    if (!Object.hasOwn(lockDependencies, dep)) {
      return true;
    }
  }

  for (const devDep of devDependencies) {
    if (!Object.hasOwn(lockDevDependencies, devDep)) {
      return true;
    }
  }

  return false; // All dependencies are installed
}

export async function missingUndeclaredDeps(dirPath: string): Promise<string[]> {
  return new Promise((resolve) => {
    // Ignore the err argument because depcheck exists with a non zero code (255) when there are missing deps.
    exec(
      `npm run depcheck ${Path.resolve(dirPath)} -- --json`,
      { cwd: DIST_DIR },
      (_err, stdout) => {
        const output = stdout || '';

        // Use regex to extract JSON object
        const jsonMatch = output.match(/{.*}/s);
        if (!jsonMatch) {
          throw new Error('Failed to extract JSON from depcheck output. Got ' + output);
        }

        // Parse the JSON
        const parsedResult = JSON.parse(jsonMatch[0]);

        // Process and return the data as needed
        resolve(Object.keys(parsedResult.missing));
      },
    );
  });
}
