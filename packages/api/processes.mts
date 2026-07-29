import { ChildProcess } from 'node:child_process';

export class Processes {
  private processes: Record<string, ChildProcess> = {};

  add(sessionId: string, cellId: string, process: ChildProcess) {
    const key = this.toKey(sessionId, cellId);

    if (typeof process.pid !== 'number') {
      throw new Error('Cannot add a process with no pid');
    }

    if (process.killed) {
      throw new Error('Cannot add a process that has been killed');
    }

    this.processes[key] = process;

    process.on('exit', () => {
      // Only forget this process if it is still the one registered under the key.
      //
      // Running the same cell twice before the first exits replaces the entry, and
      // without this check the first process's exit would delete the second's key —
      // leaving a running process that `kill` then claims doesn't exist.
      if (this.processes[key] === process) {
        delete this.processes[key];
      }
    });
  }

  has(sessionId: string, cellId: string) {
    return this.toKey(sessionId, cellId) in this.processes;
  }

  kill(sessionId: string, cellId: string) {
    const key = this.toKey(sessionId, cellId);

    const process = this.processes[key];

    if (!process) {
      throw new Error(
        `Cannot kill process: no process for session ${sessionId} and cell ${cellId} exists`,
      );
    }

    if (process.killed) {
      throw new Error(
        `Cannot kill process for session ${sessionId} and cell ${cellId}: process has already been killed`,
      );
    }

    return process.kill('SIGTERM');
  }

  private toKey(sessionId: string, cellId: string) {
    return sessionId + ':' + cellId;
  }
}

export default new Processes();
