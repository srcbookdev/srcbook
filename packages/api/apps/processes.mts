import { ChildProcess } from 'node:child_process';
import { pathToApp } from './disk.mjs';
import { npmInstall as execNpmInstall, vite as execVite } from '../exec.mjs';
import { wss } from '../index.mjs';

export type ProcessType = 'npm:install' | 'vite:server';

export interface NpmInstallProcessType {
  type: 'npm:install';
  process: ChildProcess;
}

export interface ViteServerProcessType {
  type: 'vite:server';
  process: ChildProcess;
  port: number | null;
}

export type AppProcessType = NpmInstallProcessType | ViteServerProcessType;

class Processes {
  private map: Map<string, AppProcessType> = new Map();

  has(appId: string, type: ProcessType) {
    return this.map.has(this.toKey(appId, type));
  }

  get(appId: string, type: ProcessType) {
    return this.map.get(this.toKey(appId, type));
  }

  set(appId: string, process: AppProcessType) {
    this.map.set(this.toKey(appId, process.type), process);
  }

  del(appId: string, type: ProcessType) {
    return this.map.delete(this.toKey(appId, type));
  }

  private toKey(appId: string, type: ProcessType) {
    return `${appId}:${type}`;
  }
}

const processes = new Processes();

export function getAppProcess(appId: string, type: 'npm:install'): NpmInstallProcessType;
export function getAppProcess(appId: string, type: 'vite:server'): ViteServerProcessType;
export function getAppProcess(appId: string, type: ProcessType): AppProcessType {
  switch (type) {
    case 'npm:install':
      return processes.get(appId, type) as NpmInstallProcessType;
    case 'vite:server':
      return processes.get(appId, type) as ViteServerProcessType;
  }
}

export function setAppProcess(appId: string, process: AppProcessType) {
  processes.set(appId, process);
}

export function deleteAppProcess(appId: string, process: ProcessType) {
  processes.del(appId, process);
}

export async function waitForProcessToComplete(process: AppProcessType): Promise<void> {
  if (process.process.exitCode !== null) {
    return;
  }

  return new Promise((resolve, reject) => {
    process.process.once('exit', () => {
      resolve();
    });
    process.process.once('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Runs npm install for the given app.
 *
 * If there's already a process running npm install, it will return that process.
 */
export function npmInstall(
  appId: string,
  options: Omit<Partial<Parameters<typeof execNpmInstall>[0]>, 'cwd'> & { onStart?: () => void },
) {
  const runningProcess = processes.get(appId, 'npm:install');
  if (runningProcess) {
    return runningProcess;
  }

  wss.broadcast(`app:${appId}`, 'deps:install:status', { status: 'installing' });
  if (options.onStart) {
    options.onStart();
  }

  const newlyStartedProcess: NpmInstallProcessType = {
    type: 'npm:install',
    process: execNpmInstall({
      ...options,

      cwd: pathToApp(appId),
      stdout: (data) => {
        wss.broadcast(`app:${appId}`, 'deps:install:log', {
          log: { type: 'stdout', data: data.toString('utf8') },
        });

        if (options.stdout) {
          options.stdout(data);
        }
      },
      stderr: (data) => {
        wss.broadcast(`app:${appId}`, 'deps:install:log', {
          log: { type: 'stderr', data: data.toString('utf8') },
        });

        if (options.stderr) {
          options.stderr(data);
        }
      },
      onExit: (code, signal) => {
        // We must clean up this process so that we can run npm install again
        deleteAppProcess(appId, 'npm:install');

        wss.broadcast(`app:${appId}`, 'deps:install:status', {
          status: code === 0 ? 'complete' : 'failed',
          code,
        });

        if (code === 0) {
          wss.broadcast(`app:${appId}`, 'deps:status:response', {
            nodeModulesExists: true,
          });
        }

        if (options.onExit) {
          options.onExit(code, signal);
        }
      },
    }),
  };
  processes.set(appId, newlyStartedProcess);

  return newlyStartedProcess;
}

/**
 * Runs a vite dev server for the given app.
 *
 * If there's already a process running the vite dev server, it will return that process.
 */
export function viteServer(appId: string, options: Omit<Parameters<typeof execVite>[0], 'cwd'>) {
  if (!processes.has(appId, 'vite:server')) {
    processes.set(appId, {
      type: 'vite:server',
      process: execVite({ cwd: pathToApp(appId), ...options }),
      port: null,
    });
  }

  return processes.get(appId, 'vite:server');
}
