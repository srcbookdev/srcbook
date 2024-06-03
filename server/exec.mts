import Path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import depcheck from 'depcheck';

export type BaseExecRequestType = {
  cwd: string;
  stdout: (data: Buffer) => void;
  stderr: (data: Buffer) => void;
  onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
};

export type NodeRequestType = BaseExecRequestType & {
  env: NodeJS.ProcessEnv;
  entry: string;
};

export type NPMInstallRequestType = BaseExecRequestType & {
  package?: string;
};

/**
 * Execute a JavaScript file using node.
 *
 * Example:
 *
 *     node({
 *       cwd: '/Users/ben/.srcbook/foo',
 *       env: {FOO_ENV_VAR: 'foooooooo'},
 *       entry: foo.mjs',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 */
export function node(options: NodeRequestType) {
  const { cwd, env, entry, stdout, stderr, onExit } = options;

  const filepath = Path.isAbsolute(entry) ? entry : Path.join(cwd, entry);

  // Explicitly using spawn here (over fork) to make it clear these
  // processes should be as decoupled from one another as possible.
  const child = spawn('node', [filepath], { cwd, env: { ...process.env, ...env } });

  child.stdout.on('data', stdout);
  child.stderr.on('data', stderr);

  child.on('error', () => {
    // Sometimes it's expected we abort the child process (e.g., user stops a running cell).
    // Doing so crashes the parent process unless this callback callback is registered.
    //
    // TODO: Find a way to handle unexpected errors here.
  });

  child.on('exit', (code, signal) => {
    onExit && onExit(code, signal);
  });

  return child;
}

/**
 * Run npm install.
 *
 * Install all packages:
 *
 *     npmInstall({
 *       cwd: '/Users/ben/.srcbook/foo',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 * Install a specific package:
 *
 *     npmInstall({
 *       cwd: '/Users/ben/.srcbook/foo',
 *       package: 'marked',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 */
export function npmInstall(options: NPMInstallRequestType) {
  const { cwd, stdout, stderr, onExit } = options;

  const args = options.package ? ['install', options.package] : ['install'];

  const child = spawn('npm', args, { cwd });

  child.stdout.on('data', stdout);
  child.stderr.on('data', stderr);

  child.on('error', () => {
    // Sometimes it's expected we abort the child process (e.g., user stops a running cell).
    // Doing so crashes the parent process unless this callback callback is registered.
    //
    // TODO: Find a way to handle unexpected errors here.
  });

  child.on('exit', (code, signal) => {
    onExit && onExit(code, signal);
  });

  return child;
}

/**
 * Utility function to determine if we should nudge the user to run `npm install`.
 *
 * There are a few conditions that should trigger this:
 * - package.json has dependencies but package-lock.json is missing
 * -
 */
export async function shouldRunDeps(cwd: string): Promise<boolean> {
  const missingDeclaredDeps = hasMissingDeclaredDeps(cwd);

  const missingUndeclaredDeps = await hasMissingUndeclaredDeps(cwd);

  return missingDeclaredDeps || missingUndeclaredDeps;
}

function hasMissingDeclaredDeps(cwd: string): boolean {
  const packageJsonPath = Path.join(cwd, 'package.json');
  const packageLockPath = Path.join(cwd, 'package-lock.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found in the specified directory.');
  }

  const packageJsonData = fs.readFileSync(packageJsonPath, 'utf8');
  const pkgJson = JSON.parse(packageJsonData);

  const dependencies = pkgJson.dependencies || {};
  const devDependencies = pkgJson.devDependencies || {};

  const allDeps = { ...dependencies, ...devDependencies };
  const allDepsKeys = Object.keys(allDeps);

  if (allDepsKeys.length === 0) {
    return false; // No dependencies to install
  }

  if (!fs.existsSync(packageLockPath)) {
    return true; // package-lock.json does not exist, need to run npm install
  }

  const packageLockData = fs.readFileSync(packageLockPath, 'utf8');
  const pkgLockJson = JSON.parse(packageLockData);

  // This feels brittle but the empty string key is the convention for the root package.
  const installedDeps = pkgLockJson.packages[''].dependencies || {};

  for (const dep of allDepsKeys) {
    if (!installedDeps[dep]) {
      return true; // Dependency in package.json not found in package-lock.json
    }
  }
  return false; // All dependencies are installed
}

async function hasMissingUndeclaredDeps(cwd: string): Promise<boolean> {
  const result = await depcheck(cwd, {});
  return Object.keys(result.missing).length > 0;
}
