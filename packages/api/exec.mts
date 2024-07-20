import Path from 'node:path';
import { spawn } from 'node:child_process';

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
 *       cwd: '/Users/ben/.srcbook/30v2av4eee17m59dg2c29758to',
 *       env: {FOO_ENV_VAR: 'foooooooo'},
 *       entry: '/Users/ben/.srcbook/30v2av4eee17m59dg2c29758to/src/foo.js',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 */
export function node(options: NodeRequestType) {
  const { cwd, env, entry, stdout, stderr, onExit } = options;

  return spawnCall({
    command: 'node',
    cwd,
    args: [entry],
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
 *       cwd: '/Users/ben/.srcbook/30v2av4eee17m59dg2c29758to',
 *       env: {FOO_ENV_VAR: 'foooooooo'},
 *       entry: '/Users/ben/.srcbook/30v2av4eee17m59dg2c29758to/src/foo.ts',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 */
export function tsx(options: NodeRequestType) {
  const { cwd, env, entry, stdout, stderr, onExit } = options;

  // We are making an assumption about `tsx` being the tool of choice
  // for running TypeScript, as well as where it's located on the file system.
  return spawnCall({
    command: Path.join(cwd, 'node_modules', '.bin', 'tsx'),
    cwd,
    args: [entry],
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

  const args = options.packages
    ? ['install', '--include=dev', ...options.packages]
    : ['install', '--include=dev'];

  return spawnCall({ command: 'npm', cwd, args, stdout, stderr, onExit, env: process.env });
}
