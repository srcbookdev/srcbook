/* eslint-disable turbo/no-undeclared-env-vars */
import Path from 'node:path';
import { spawn } from 'node:child_process';

interface NodeError extends Error {
  code?: string;
}

/**
 * Base type for execution requests containing common properties
 */
export type BaseExecRequestType = {
  cwd: string;
  stdout: (data: Buffer) => void;
  stderr: (data: Buffer) => void;
  onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
  onError?: (err: NodeError) => void;
};

/**
 * Type for Node.js execution requests
 */
export type NodeRequestType = BaseExecRequestType & {
  env: NodeJS.ProcessEnv;
  entry: string;
};

/**
 * Type for NPM installation requests
 */
export type NPMInstallRequestType = BaseExecRequestType & {
  packages?: Array<string>;
  args?: Array<string>;
};

/**
 * Type for NPX execution requests
 */
type NpxRequestType = BaseExecRequestType & {
  args: Array<string>;
  env?: NodeJS.ProcessEnv;
};

/**
 * Type for spawn call requests
 */
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

/**
 * General spawn call utility to execute a command with arguments.
 * Enhanced with Windows-specific handling and improved error management.
 */
export function spawnCall(options: SpawnCallRequestType) {
  const { cwd, env, command, args, stdout, stderr, onExit, onError } = options;

  // Handle Windows-specific path resolution
  let finalCommand = command;
  let finalArgs = args;

  if (process.platform === 'win32') {
    // Check if the command ends with .cmd
    if (command.endsWith('.cmd')) {
      finalCommand = Path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');
      finalArgs = ['/c', command, ...args];
    } else if (Path.isAbsolute(command) && !command.includes('System32')) {
      // For absolute paths that aren't System32 commands, still use cmd.exe
      finalCommand = Path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');
      finalArgs = ['/c', command, ...args];
    }
  }

  // Ensure the environment PATH is properly set
  const finalEnv = { ...env };
  if (process.platform === 'win32') {
    const additionalPaths = [
      Path.dirname(command), // Add the directory of the command
      'C:\\Program Files\\nodejs',
      'C:\\Program Files (x86)\\nodejs',
      Path.join(process.env.APPDATA || '', 'npm'),
      Path.join(process.env.LOCALAPPDATA || '', 'npm'),
    ];

    const existingPath = finalEnv.PATH || '';
    const newPaths = additionalPaths.filter((path) => !existingPath.includes(path)).join(';');

    finalEnv.PATH = newPaths + (existingPath ? ';' + existingPath : '');
  }

  console.log(`Executing command: ${finalCommand}`);
  console.log(`With args:`, finalArgs);
  console.log(`In directory: ${cwd}`);

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

  // Get the correct tsx executable path for the platform
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

  // Get the npm executable path based on platform
  const npmCommand =
    process.platform === 'win32'
      ? Path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')
      : 'npm';

  // Construct the arguments differently for Windows
  const installArgs =
    process.platform === 'win32'
      ? ['/c', 'npm', 'install', '--include=dev', ...(args || []), ...(packages || [])]
      : ['install', '--include=dev', ...(args || []), ...(packages || [])];

  // Set up the environment variables
  const env = { ...process.env };

  // Ensure PATH includes necessary directories for Windows
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
 *
 * Example:
 *
 *     vite({
 *       cwd: '/path/to/project',
 *       args: ['build'],
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 */
export function vite(options: NpxRequestType) {
  const { cwd, args = [], env = process.env } = options;

  if (process.platform === 'win32') {
    const npmCommand = Path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');

    // Construct a command that will work in Windows
    const fullArgs = [
      '/c',
      'npm',
      'exec', // Use 'exec' instead of npx
      '--yes', // Auto-approve any needed installations
      '--', // Separator for the command
      'vite', // The command to run
      ...(args || []), // Any additional arguments
    ];

    console.log(`Running vite with npm exec`);
    console.log(`In directory: ${cwd}`);
    console.log(`Command: ${npmCommand}`);
    console.log(`Arguments:`, fullArgs);

    return spawnCall({
      ...options,
      command: npmCommand,
      args: fullArgs,
      env: {
        ...env,
        FORCE_COLOR: '1',
        // Add necessary paths
        PATH: [
          Path.join(cwd, 'node_modules', '.bin'),
          Path.join(process.env.APPDATA || '', 'npm'),
          env.PATH || '',
        ].join(Path.delimiter),
      },
    });
  }

  // Non-Windows platforms
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
