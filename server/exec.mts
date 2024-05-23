import Path from 'node:path';
import { spawn } from 'node:child_process';
import { ProcessOutputType } from './types';
import { getSecrets } from './config.mjs';

export type ExecRequestType = {
  cwd: string;
};

export type ExecResponseType = {
  exitCode: number;
  output: ProcessOutputType[];
};

/**
 * Execute a JavaScript file using node.
 *
 * Example:
 *
 *     const { exitCode, output } = await exec('foo.mjs', {
 *       cwd: '/Users/ben/.srcbook/foo',
 *     });
 *
 * @param file Path of file to execute. Can be an absolute path or relative. If relative, it's joined with `options.cwd`.
 * @param options
 * @param options.cwd Current working directory of the child process.
 * @returns An object containing the exit code and stdout/err.
 */
export async function exec(file: string, options: ExecRequestType): Promise<ExecResponseType> {
  const secrets = await getSecrets();
  return new Promise((resolve) => {
    const cwd = options.cwd;
    const filepath = Path.isAbsolute(file) ? file : Path.join(cwd, file);

    // Explicitly using spawn here (over fork) to make it clear these
    // processes should be as decoupled from one another as possible.
    const child = spawn('node', [filepath], {
      cwd: cwd,
      env: Object.assign({}, process.env, secrets),
    });

    const output: ProcessOutputType[] = [];

    child.stdout.on('data', (data) => {
      output.push({ type: 'stdout', data: data.toString('utf8') });
    });

    child.stderr.on('data', (data) => {
      output.push({ type: 'stderr', data: data.toString('utf8') });
    });

    child.on('close', (code) => {
      resolve({ exitCode: code!, output: output });
    });
  });
}
