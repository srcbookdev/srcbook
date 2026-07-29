import Path from 'node:path';
import { execFile } from 'node:child_process';
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
  return new Promise((resolve, reject) => {
    // execFile rather than exec: dirPath must not reach a shell.
    // The err argument is ignored because depcheck exits non-zero (255) precisely
    // when it finds missing deps, which is the case we care about.
    execFile(
      'npm',
      ['run', 'depcheck', Path.resolve(dirPath), '--', '--json'],
      { cwd: DIST_DIR },
      (_err, stdout) => {
        // Everything below runs in a callback, so a throw here would escape the
        // promise entirely and take the process down rather than rejecting. This
        // is on the cell-execution path, so that was a crash on every run whose
        // depcheck output didn't parse.
        try {
          const jsonMatch = (stdout || '').match(/{.*}/s);

          if (!jsonMatch) {
            reject(new Error('Failed to extract JSON from depcheck output.'));
            return;
          }

          const parsedResult = JSON.parse(jsonMatch[0]);
          resolve(Object.keys(parsedResult.missing ?? {}));
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      },
    );
  });
}
