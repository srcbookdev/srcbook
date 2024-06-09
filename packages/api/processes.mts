import { ChildProcess } from 'node:child_process';

class Processes {
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
      delete this.processes[key];
    });
  }

  send(sessionId: string, cellId: string, stdin: string) {
    const key = this.toKey(sessionId, cellId);

    const process = this.processes[key];

    if (!process) {
      console.warn('Cannot send stdin to non-existing process');
      return;
    }

    if (typeof process.pid !== 'number' || process.killed) {
      console.warn('Cannot send stdin to a dead process');
      return;
    }

    process.stdin?.write(stdin);
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
