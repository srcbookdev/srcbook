import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { Processes } from '../processes.mjs';

/**
 * Minimal stand-in for a ChildProcess: the registry only looks at `pid`, `killed`,
 * `kill()` and the 'exit' event.
 */
class FakeProcess extends EventEmitter {
  pid: number | undefined;
  killed = false;

  constructor(pid: number | undefined = 1234) {
    super();
    this.pid = pid;
  }

  kill(_signal?: string) {
    this.killed = true;
    return true;
  }

  exit() {
    this.emit('exit');
  }

  asChildProcess() {
    return this as unknown as ChildProcess;
  }
}

describe('Processes', () => {
  it('registers and kills a process', () => {
    const processes = new Processes();
    const proc = new FakeProcess();

    processes.add('session1', 'cell1', proc.asChildProcess());

    expect(processes.has('session1', 'cell1')).toBe(true);
    expect(processes.kill('session1', 'cell1')).toBe(true);
    expect(proc.killed).toBe(true);
  });

  it('forgets a process once it exits', () => {
    const processes = new Processes();
    const proc = new FakeProcess();

    processes.add('session1', 'cell1', proc.asChildProcess());
    proc.exit();

    expect(processes.has('session1', 'cell1')).toBe(false);
  });

  it('refuses a process with no pid', () => {
    const processes = new Processes();
    const proc = new FakeProcess();
    // A ChildProcess has no pid when the spawn itself failed.
    proc.pid = undefined;
    expect(() => processes.add('s', 'c', proc.asChildProcess())).toThrow(/no pid/);
  });

  it('refuses an already-killed process', () => {
    const processes = new Processes();
    const proc = new FakeProcess();
    proc.killed = true;
    expect(() => processes.add('s', 'c', proc.asChildProcess())).toThrow(/killed/);
  });

  it('throws when killing a cell with nothing running', () => {
    const processes = new Processes();
    expect(() => processes.kill('session1', 'cell1')).toThrow(/no process/);
  });

  it('keys processes separately per session and per cell', () => {
    const processes = new Processes();
    const a = new FakeProcess(1);
    const b = new FakeProcess(2);

    processes.add('session1', 'cell1', a.asChildProcess());
    processes.add('session2', 'cell1', b.asChildProcess());

    processes.kill('session1', 'cell1');

    expect(a.killed).toBe(true);
    expect(b.killed).toBe(false);
  });

  // The regression this file exists for. Running a cell again before the first run
  // exits replaces the registry entry; the first process's exit handler then used to
  // delete the key belonging to the second, leaving something running that `kill`
  // insisted did not exist.
  it('keeps the second process registered when the first exits after being replaced', () => {
    const processes = new Processes();
    const first = new FakeProcess(1);
    const second = new FakeProcess(2);

    processes.add('session1', 'cell1', first.asChildProcess());
    processes.add('session1', 'cell1', second.asChildProcess());

    first.exit();

    expect(processes.has('session1', 'cell1')).toBe(true);
    expect(() => processes.kill('session1', 'cell1')).not.toThrow();
    expect(second.killed).toBe(true);
  });

  it('forgets the key when the surviving process finally exits', () => {
    const processes = new Processes();
    const first = new FakeProcess(1);
    const second = new FakeProcess(2);

    processes.add('session1', 'cell1', first.asChildProcess());
    processes.add('session1', 'cell1', second.asChildProcess());

    first.exit();
    second.exit();

    expect(processes.has('session1', 'cell1')).toBe(false);
  });
});
