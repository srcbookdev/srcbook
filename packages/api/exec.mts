/* eslint-disable turbo/no-undeclared-env-vars */
import Path from 'node:path';
import { spawn, execSync } from 'node:child_process';

interface NodeError extends Error {
  code?: string;
}

export type BaseExecRequestType = {
  cwd: string;
  stdout: (data: Buffer) => void;
  stderr: (data: Buffer) => void;
  onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
  onError?: (err: NodeError) => void;
};

export type NodeRequestType = BaseExecRequestType & {
  env: NodeJS.ProcessEnv;
  entry: string;
};

export type NPMInstallRequestType = BaseExecRequestType & {
  packages?: Array<string>;
  args?: Array<string>;
};

type NpxRequestType = BaseExecRequestType & {
  args: Array<string>;
  env?: NodeJS.ProcessEnv;
};

type SpawnCallRequestType = {
  cwd: string;
  env: NodeJS.ProcessEnv;
  command: string;
  args: Array<string>;
  stdout: (data: Buffer) => void;
  stderr: (data: Buffer) => void;
  onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
  onError?: (err: NodeError) => void;
};

class ExecutableResolver {
  private static instance: ExecutableResolver;
  private cachedPaths: Map<string, string> = new Map();

  static getInstance(): ExecutableResolver {
    if (!this.instance) {
      this.instance = new ExecutableResolver();
    }
    return this.instance;
  }

  private findExecutablePath(command: string): string {
    try {
      if (process.platform === 'win32') {
        const paths = execSync(`where ${command}`)
          .toString()
          .trim()
          .split('\n')
          .map((p) => p.trim());
        return paths.find((p) => p.includes('Program Files')) ?? paths[0] ?? command;
      }
      return execSync(`which ${command}`).toString().trim();
    } catch {
      return command;
    }
  }

  getPath(command: string): string {
    if (!this.cachedPaths.has(command)) {
      this.cachedPaths.set(command, this.findExecutablePath(command));
    }
    return this.cachedPaths.get(command)!;
  }
}

export function spawnCall(options: SpawnCallRequestType) {
  const { cwd, env, command, args, stdout, stderr, onExit, onError } = options;

  const child = spawn(command, args, {
    cwd,
    env,
    windowsVerbatimArguments: process.platform === 'win32',
    shell: process.platform === 'win32',
  });

  child.stdout.on('data', stdout);
  child.stderr.on('data', stderr);
  child.on('error', onError || console.error);
  child.on('exit', onExit);

  return child;
}

/**
 * Execute a JavaScript file using node.
 *
 * Example:
 *
 *     node({
 *       cwd: '/path/to/project',
 *       env: {FOO_ENV_VAR: 'value'},
 *       entry: '/path/to/file.js',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 */
export const node = ({ cwd, env, entry, ...rest }: NodeRequestType) =>
  spawnCall({
    command: ExecutableResolver.getInstance().getPath('node'),
    cwd,
    args: [entry],
    env: { ...process.env, ...env },
    ...rest,
  });

/**
 * Execute a TypeScript file using tsx.
 *
 * Example:
 *
 *     tsx({
 *       cwd: '/path/to/project',
 *       env: {FOO_ENV_VAR: 'value'},
 *       entry: '/path/to/file.ts',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 */
export const tsx = ({ cwd, env, entry, ...rest }: NodeRequestType) =>
  spawnCall({
    command:
      process.platform === 'win32'
        ? Path.join(cwd, 'node_modules', '.bin', 'tsx.cmd')
        : Path.join(cwd, 'node_modules', '.bin', 'tsx'),
    cwd,
    args: [entry],
    env: { ...process.env, ...env },
    ...rest,
  });

/**
 * Run npm install.
 *
 * Install all packages:
 *
 *     npmInstall({
 *       cwd: '/path/to/project',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 * Install a specific package:
 *
 *     npmInstall({
 *       cwd: '/path/to/project',
 *       packages: ['lodash'],
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 */
export const npmInstall = ({ cwd, packages = [], args = [], ...rest }: NPMInstallRequestType) =>
  spawnCall({
    command: 'npm',
    cwd,
    args: ['install', '--include=dev', ...args, ...packages],
    env: process.env,
    ...rest,
  });

/**
 * Run vite.
 */
export const vite = ({ cwd, args = [], env = process.env, ...rest }: NpxRequestType) =>
  spawnCall({
    command:
      process.platform === 'win32' ? 'npx.cmd' : Path.join(cwd, 'node_modules', '.bin', 'vite'),
    cwd,
    args: process.platform === 'win32' ? ['vite', ...args] : args,
    env: {
      ...env,
      FORCE_COLOR: '1',
    },
    ...rest,
  });
