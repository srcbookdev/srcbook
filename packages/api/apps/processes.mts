import { ChildProcess } from 'node:child_process';
import { pathToApp } from './disk.mjs';
import { npmInstall as execNpmInstall, vite as execVite } from '../exec.mjs';

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
    process.process.once("exit", () => {
      resolve();
    });
    process.process.once("error", (err) => {
      reject(err);
    });
  })
}

/**
 * Runs npm install for the given app.
 *
 * If there's already a process running npm install, it will return that process.
 */
export function npmInstall(
  appId: string,
  options: Omit<Parameters<typeof execNpmInstall>[0], 'cwd'> & { onStart?: () => void },
) {
  const runningProcess = processes.get(appId, 'npm:install');
  if (runningProcess) {
    return runningProcess;
  }

  if (options.onStart) {
    options.onStart();
  }
  const newlyStartedProcess: NpmInstallProcessType = {
    type: 'npm:install',
    process: execNpmInstall({ cwd: pathToApp(appId), ...options }),
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
