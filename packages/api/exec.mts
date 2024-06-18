import Path from 'node:path';
import { spawn } from 'node:child_process';
import { DEFAULT_TSCONFIG_PATH, DEFAULT_TSCONFIG } from './constants.mjs';
import { tsConfigToArgs } from './utils.mjs';

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
  packages?: Array<string>;
};

type SpawnCallRequestType = {
  cwd: string;
  env: NodeJS.ProcessEnv;
  command: string;
  args: Array<string>;
  stdout: (data: Buffer) => void;
  stderr: (data: Buffer) => void;
  onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
};

export function spawnCall(options: SpawnCallRequestType) {
  const { cwd, env, command, args, stdout, stderr, onExit } = options;
  const child = spawn(command, args, { cwd: cwd, env: env });

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
 * Execute a JavaScript file using node.
 *
 * Example:
 *
 *     node({
 *       cwd: '/Users/ben/.srcbook/foo',
 *       env: {FOO_ENV_VAR: 'foooooooo'},
 *       entry: 'foo.js',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 */
export function node(options: NodeRequestType) {
  const { cwd, env, entry, stdout, stderr, onExit } = options;

  const filepath = Path.isAbsolute(entry) ? entry : Path.join(cwd, entry);

  return spawnCall({
    command: 'node',
    cwd,
    args: [filepath],
    stdout,
    stderr,
    onExit,
    env: { ...process.env, ...env },
  });
}

export function tsc(options: NodeRequestType) {
  const { cwd, env, entry, stdout, stderr, onExit } = options;

  const filepath = Path.isAbsolute(entry) ? entry : Path.join(cwd, entry);

  return spawnCall({
    command: Path.join(cwd, 'node_modules', '.bin', 'tsc'),
    cwd,
    args: [filepath, ...tsConfigToArgs(DEFAULT_TSCONFIG)],
    stdout,
    stderr,
    onExit,
    env: { ...process.env, ...env },
  });
}

/**
 * Execute a TypeScript file using tsx.
 *
 * Example:
 *
 *     tsx({
 *       cwd: '/Users/ben/.srcbook/foo',
 *       env: {FOO_ENV_VAR: 'foooooooo'},
 *       entry: 'foo.ts',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 */
export function tsx(options: NodeRequestType) {
  const { cwd, env, entry, stdout, stderr, onExit } = options;

  const filepath = Path.isAbsolute(entry) ? entry : Path.join(cwd, entry);

  // We are making an assumption about `tsx` being the tool of choice
  // for running TypeScript, as well as where it's located on the file system.

  return spawnCall({
    command: Path.join(cwd, 'node_modules', '.bin', 'tsx'),
    cwd,
    args: ['--tsconfig', DEFAULT_TSCONFIG_PATH, filepath],
    stdout,
    stderr,
    onExit,
    env: { ...process.env, ...env },
  });
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

  const args = options.packages ? ['install', ...options.packages] : ['install'];

  return spawnCall({ command: 'npm', cwd, args, stdout, stderr, onExit, env: process.env });
}
