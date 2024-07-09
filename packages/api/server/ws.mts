import { ChildProcess } from 'node:child_process';
import {
  findSession,
  findCell,
  replaceCell,
  updateSession,
  readPackageJsonContentsFromDisk,
  updateCell,
} from '../session.mjs';
import { getSecrets } from '../config.mjs';
import type { SessionType } from '../types.mjs';
import { node, npmInstall, tsc, tsx } from '../exec.mjs';
import { shouldNpmInstall, missingUndeclaredDeps } from '../deps.mjs';
import processes from '../processes.mjs';
import type {
  CodeCellType,
  PackageJsonCellType,
  CellExecPayloadType,
  DepsInstallPayloadType,
  DepsValidatePayloadType,
  CellStopPayloadType,
  CellUpdatePayloadType,
} from '@srcbook/shared';
import {
  CellErrorPayloadSchema,
  CellUpdatePayloadSchema,
  CellExecPayloadSchema,
  CellStopPayloadSchema,
  DepsInstallPayloadSchema,
  DepsValidatePayloadSchema,
  CellUpdatedPayloadSchema,
  CellOutputPayloadSchema,
  DepsValidateResponsePayloadSchema,
} from '@srcbook/shared';
import WebSocketServer from './ws-client.mjs';
import { pathToCodeFile } from '../srcbook/path.mjs';

const wss = new WebSocketServer();

function addRunningProcess(
  session: SessionType,
  cell: CodeCellType | PackageJsonCellType,
  process: ChildProcess,
) {
  // If the process was not successfully started, inform the client the cell is 'idle' again.
  //
  // TODO:
  //
  //     1. If process couldn't start due to an error, add error handling so the client knows
  //     2. Ensure that there's no way the process could have started and successfully exited before we get here, causing the client to think it didn't run but it did.
  //
  if (!process.pid || process.killed) {
    cell.status = 'idle';
    wss.broadcast(`session:${session.id}`, 'cell:updated', { cell });
  } else {
    processes.add(session.id, cell.id, process);
  }
}

async function nudgeMissingDeps(wss: WebSocketServer, session: SessionType) {
  try {
    if (await shouldNpmInstall(session.dir)) {
      wss.broadcast(`session:${session.id}`, 'deps:validate:response', {});
    }
  } catch (e) {
    // Don't crash the server on dependency validation, but log the error
    console.error(`Error validating dependencies for session ${session.id}: ${e}`);
  }

  try {
    const missingDeps = await missingUndeclaredDeps(session.dir);

    if (missingDeps.length > 0) {
      wss.broadcast(`session:${session.id}`, 'deps:validate:response', { packages: missingDeps });
    }
  } catch (e) {
    // Don't crash the server on dependency validation, but log the error
    console.error(`Error running depcheck for session ${session.id}: ${e}`);
  }
}

async function cellExec(payload: CellExecPayloadType) {
  const session = await findSession(payload.sessionId);
  const cell = findCell(session, payload.cellId);

  if (!cell || cell.type !== 'code') {
    console.error(`Cannot execute cell with id ${payload.cellId}; cell not found.`);
    return;
  }

  nudgeMissingDeps(wss, session);

  const secrets = await getSecrets();

  cell.status = 'running';
  wss.broadcast(`session:${session.id}`, 'cell:updated', { cell });

  switch (cell.language) {
    case 'javascript':
      jsExec({ session, cell, secrets });
      break;
    case 'typescript':
      tscExec({ session, cell, secrets });
      tsxExec({ session, cell, secrets });
      break;
    default:
      console.error(`Unsupported language '${cell.language}' for cell ${cell.id}`);
  }
}

type ExecRequestType = {
  session: SessionType;
  cell: CodeCellType;
  secrets: Record<string, string>;
};

async function jsExec({ session, cell, secrets }: ExecRequestType) {
  addRunningProcess(
    session,
    cell,
    node({
      cwd: session.dir,
      env: secrets,
      entry: pathToCodeFile(session.dir, cell.filename),
      stdout(data) {
        wss.broadcast(`session:${session.id}`, 'cell:output', {
          cellId: cell.id,
          output: { type: 'stdout', data: data.toString('utf8') },
        });
      },
      stderr(data) {
        wss.broadcast(`session:${session.id}`, 'cell:output', {
          cellId: cell.id,
          output: { type: 'stderr', data: data.toString('utf8') },
        });
      },
      onExit() {
        // Reload cell to get most recent version which may have been updated since
        // in the time between initially running this cell and when running finishes.
        //
        // TODO: Real state management pls.
        //
        const mostRecentCell = session.cells.find((c) => c.id === cell.id) as CodeCellType;
        mostRecentCell.status = 'idle';
        wss.broadcast(`session:${session.id}`, 'cell:updated', { cell: mostRecentCell });
      },
    }),
  );
}

async function tsxExec({ session, cell, secrets }: ExecRequestType) {
  addRunningProcess(
    session,
    cell,
    tsx({
      cwd: session.dir,
      env: secrets,
      entry: pathToCodeFile(session.dir, cell.filename),
      stdout(data) {
        wss.broadcast(`session:${session.id}`, 'cell:output', {
          cellId: cell.id,
          output: { type: 'stdout', data: data.toString('utf8') },
        });
      },
      stderr(data) {
        wss.broadcast(`session:${session.id}`, 'cell:output', {
          cellId: cell.id,
          output: { type: 'stderr', data: data.toString('utf8') },
        });
      },
      onExit() {
        // Reload cell to get most recent version which may have been updated since
        // in the time between initially running this cell and when running finishes.
        //
        // TODO: Real state management pls.
        //
        const mostRecentCell = session.cells.find((c) => c.id === cell.id) as CodeCellType;
        mostRecentCell.status = 'idle';
        wss.broadcast(`session:${session.id}`, 'cell:updated', { cell: mostRecentCell });
      },
    }),
  );
}

async function tscExec({ session, cell, secrets }: ExecRequestType) {
  // Do not `addRunningProcess` here because:
  //
  //     1. There is no "Stop running cell" functionality for type checking, only for the running code (processes are tracked so they can be stopped)
  //     2. `addRunningProcess` will use the same key for tscExec and tsxExec. If the type checking process finishes before a code process,
  //        it will unregister the process in the processes map, which then causes "stop running cell" to break for that cell.
  //
  tsc({
    cwd: session.dir,
    env: secrets,
    entry: pathToCodeFile(session.dir, cell.filename),
    stdout(data) {
      wss.broadcast(`session:${session.id}`, 'cell:output', {
        cellId: cell.id,
        output: { type: 'tsc', data: data.toString('utf8') },
      });
    },
    stderr(data) {
      wss.broadcast(`session:${session.id}`, 'cell:output', {
        cellId: cell.id,
        output: { type: 'tsc', data: data.toString('utf8') },
      });
    },
    onExit() {
      // TSC is only used to send data over stdout
    },
  });
}

async function depsInstall(payload: DepsInstallPayloadType) {
  const session = await findSession(payload.sessionId);
  const cell = session.cells.find(
    (cell) => cell.type === 'package.json',
  ) as PackageJsonCellType | void;

  if (!cell) {
    console.error(`Cannot install deps; package.json cell not found`);
    return;
  }

  cell.status = 'running';
  wss.broadcast(`session:${session.id}`, 'cell:updated', { cell });

  addRunningProcess(
    session,
    cell,
    npmInstall({
      cwd: session.dir,
      packages: payload.packages,
      stdout(data) {
        wss.broadcast(`session:${session.id}`, 'cell:output', {
          cellId: cell.id,
          output: { type: 'stdout', data: data.toString('utf8') },
        });
      },
      stderr(data) {
        wss.broadcast(`session:${session.id}`, 'cell:output', {
          cellId: cell.id,
          output: { type: 'stderr', data: data.toString('utf8') },
        });
      },
      async onExit() {
        const updatedJsonSource = await readPackageJsonContentsFromDisk(session);
        const updatedCell: PackageJsonCellType = {
          ...cell,
          source: updatedJsonSource,
          status: 'idle',
        };
        updateSession(session, { cells: replaceCell(session, updatedCell) }, false);
        wss.broadcast(`session:${session.id}`, 'cell:updated', { cell: updatedCell });
      },
    }),
  );
}

async function depsValidate(payload: DepsValidatePayloadType) {
  const session = await findSession(payload.sessionId);
  nudgeMissingDeps(wss, session);
}

async function cellStop(payload: CellStopPayloadType) {
  const session = await findSession(payload.sessionId);
  const cell = findCell(session, payload.cellId);

  if (!cell || cell.type !== 'code') {
    return;
  }

  const killed = processes.kill(session.id, cell.id);

  if (!killed) {
    console.error(
      `Attempted to kill process for session ${session.id} and cell ${cell.id} but it didn't die`,
    );
  }
}

async function cellUpdate(payload: CellUpdatePayloadType) {
  const session = await findSession(payload.sessionId);

  if (!session) {
    throw new Error(`No session exists for session '${payload.sessionId}'`);
  }

  const cell = findCell(session, payload.cellId);

  if (!cell) {
    throw new Error(
      `No cell exists for session '${payload.sessionId}' and cell '${payload.cellId}'`,
    );
  }

  const result = await updateCell(session, cell, payload.updates);

  if (!result.success) {
    wss.broadcast(`session:${session.id}`, 'cell:error', {
      sessionId: session.id,
      cellId: cell.id,
      errors: result.errors,
    });

    // Revert the client's optimistic updates with most recent server cell state
    wss.broadcast(`session:${session.id}`, 'cell:updated', {
      cell: findCell(session, payload.cellId),
    });
  }
}

wss
  .channel('session:*')
  .incoming('cell:exec', CellExecPayloadSchema, cellExec)
  .incoming('cell:stop', CellStopPayloadSchema, cellStop)
  .incoming('cell:update', CellUpdatePayloadSchema, cellUpdate)
  .incoming('deps:install', DepsInstallPayloadSchema, depsInstall)
  .incoming('deps:validate', DepsValidatePayloadSchema, depsValidate)
  .outgoing('cell:updated', CellUpdatedPayloadSchema)
  .outgoing('cell:error', CellErrorPayloadSchema)
  .outgoing('cell:output', CellOutputPayloadSchema)
  .outgoing('deps:validate:response', DepsValidateResponsePayloadSchema);

export default wss;
