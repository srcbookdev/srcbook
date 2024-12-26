/* eslint-disable turbo/no-undeclared-env-vars */
import Path from 'node:path';
import { spawn } from 'node:child_process';

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

export function spawnCall(options: SpawnCallRequestType) {
  const { cwd, env, command, args, stdout, stderr, onExit, onError } = options;

  let finalCommand = command;
  let finalArgs = args;

  if (process.platform === 'win32') {
    if (command.endsWith('.cmd')) {
      finalCommand = Path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');
      finalArgs = ['/c', command, ...args];
    } else if (Path.isAbsolute(command) && !command.includes('System32')) {
      finalCommand = Path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');
      finalArgs = ['/c', command, ...args];
    }
  }

  const finalEnv = { ...env };
  if (process.platform === 'win32') {
    const additionalPaths = [
      Path.dirname(command),
      'C:\\Program Files\\nodejs',
      'C:\\Program Files (x86)\\nodejs',
      Path.join(process.env.APPDATA || '', 'npm'),
      Path.join(process.env.LOCALAPPDATA || '', 'npm'),
    ];

    const existingPath = finalEnv.PATH || '';
    const newPaths = additionalPaths.filter((path) => !existingPath.includes(path)).join(';');

    finalEnv.PATH = newPaths + (existingPath ? ';' + existingPath : '');
  }

  const child = spawn(finalCommand, finalArgs, {
    cwd: cwd,
    env: finalEnv,
    windowsVerbatimArguments: true,
    shell: process.platform === 'win32',
  });

  child.stdout.on('data', stdout);
  child.stderr.on('data', stderr);

  child.on('error', (err) => {
    if (onError) {
      onError(err);
    } else {
      console.error(err);
    }
  });

  child.on('exit', (code, signal) => {
    onExit(code, signal);
  });

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
 *       cwd: '/path/to/project',
 *       env: {FOO_ENV_VAR: 'value'},
 *       entry: '/path/to/file.ts',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 */
export function tsx(options: NodeRequestType) {
  const { cwd, env, entry, stdout, stderr, onExit } = options;

  const tsxExecutable =
    process.platform === 'win32'
      ? Path.join(cwd, 'node_modules', '.bin', 'tsx.cmd')
      : Path.join(cwd, 'node_modules', '.bin', 'tsx');

  return spawnCall({
    command: tsxExecutable,
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
export function npmInstall(options: NPMInstallRequestType) {
  const { cwd, stdout, stderr, onExit, packages, args } = options;

  const npmCommand =
    process.platform === 'win32'
      ? Path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')
      : 'npm';

  const installArgs =
    process.platform === 'win32'
      ? ['/c', 'npm', 'install', '--include=dev', ...(args || []), ...(packages || [])]
      : ['install', '--include=dev', ...(args || []), ...(packages || [])];

  const env = { ...process.env };

  if (process.platform === 'win32') {
    const additionalPaths = [
      'C:\\Program Files\\nodejs',
      'C:\\Program Files (x86)\\nodejs',
      Path.join(process.env.APPDATA || '', 'npm'),
      Path.join(process.env.LOCALAPPDATA || '', 'npm'),
    ];

    const existingPath = env.PATH || '';
    const newPaths = additionalPaths.filter((path) => !existingPath.includes(path)).join(';');

    env.PATH = newPaths + (existingPath ? ';' + existingPath : '');
  }

  return spawnCall({
    command: npmCommand,
    cwd,
    args: installArgs,
    stdout,
    stderr,
    onExit,
    env,
  });
}

/**
 * Run vite.
 */
export function vite(options: NpxRequestType) {
  const { cwd, args = [], env = process.env } = options;

  if (process.platform === 'win32') {
    const npmCommand = Path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');

    const fullArgs = ['/c', 'npm', 'exec', '--yes', '--', 'vite', ...(args || [])];

    return spawnCall({
      ...options,
      command: npmCommand,
      args: fullArgs,
      env: {
        ...env,
        FORCE_COLOR: '1',
        PATH: [
          Path.join(cwd, 'node_modules', '.bin'),
          Path.join(process.env.APPDATA || '', 'npm'),
          env.PATH || '',
        ].join(Path.delimiter),
      },
    });
  }

  const viteExecutable = Path.join(cwd, 'node_modules', '.bin', 'vite');

  return spawnCall({
    ...options,
    command: viteExecutable,
    env: {
      ...env,
      FORCE_COLOR: '1',
    },
  });
}
