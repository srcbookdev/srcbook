import { ChildProcess } from 'node:child_process';
import {
  findSession,
  findCell,
  replaceCell,
  updateSession,
  readPackageJsonContentsFromDisk,
  updateCell,
  removeCell,
} from '../session.mjs';
import { getSecrets } from '../config.mjs';
import type { SessionType } from '../types.mjs';
import { node, npmInstall, tsx } from '../exec.mjs';
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
  TsServerStartPayloadType,
  TsServerStopPayloadType,
  CellDeletePayloadType,
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
  TsServerStartPayloadSchema,
  TsServerStopPayloadSchema,
  CellDeletePayloadSchema,
  TsServerCellDiagnosticsPayloadSchema,
} from '@srcbook/shared';
import tsservers from '../tsservers.mjs';
import { TsServer } from '../tsserver/tsserver.mjs';
import WebSocketServer from './ws-client.mjs';
import { filenameFromPath, pathToCodeFile } from '../srcbook/path.mjs';
import { normalizeDiagnostic } from '../tsserver/utils.mjs';
import { removeCodeCellFromDisk } from '../srcbook/index.mjs';

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
      tsxExec({ session, cell, secrets });
      break;
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

  const cellBeforeUpdate = findCell(session, payload.cellId);

  if (!cellBeforeUpdate) {
    throw new Error(
      `No cell exists for session '${payload.sessionId}' and cell '${payload.cellId}'`,
    );
  }

  const result = await updateCell(session, cellBeforeUpdate, payload.updates);

  if (!result.success) {
    wss.broadcast(`session:${session.id}`, 'cell:error', {
      sessionId: session.id,
      cellId: payload.cellId,
      errors: result.errors,
    });

    // Revert the client's optimistic updates with most recent server cell state
    wss.broadcast(`session:${session.id}`, 'cell:updated', {
      cell: findCell(session, payload.cellId),
    });

    return;
  }

  if (
    session.metadata.language === 'typescript' &&
    cellBeforeUpdate.type === 'code' &&
    tsservers.has(session.id)
  ) {
    const cellAfterUpdate = result.cell as CodeCellType;
    const tsserver = tsservers.get(session.id);

    // These are usually the same. However, if the user renamed the cell, we need to
    // ensure that we close the old file in tsserver and open the new one.
    const oldFilePath = pathToCodeFile(session.dir, cellBeforeUpdate.filename);
    const newFilePath = pathToCodeFile(session.dir, cellAfterUpdate.filename);

    // To update a file in tsserver, close and reopen it. I assume performance of
    // this implementation is worse than calculating diffs and using `change` command
    // (although maybe not since this is not actually reading or writing to disk).
    // However, that requires calculating diffs which is more complex and may also
    // have performance implications, so sticking with the simple approach for now.
    tsserver.close({ file: oldFilePath });
    tsserver.open({ file: newFilePath, fileContent: cellAfterUpdate.source });

    // TODO: Given the amount of differences here and elsewhere when renaming cells,
    // it's probably worth it at this point to make those separate websocket events.
    if (oldFilePath !== newFilePath) {
      // Tsserver can get into a bad state if we don't reload the project after renaming a file.
      // This consistently happens under the following condition:
      //
      // 1. Rename a `a.ts` that is imported by `b.ts` to `c.ts`
      // 2. Semantic diagnostics report an error in `b.ts` that `a.ts` doesn't exist
      // 3. Great, all works so far.
      // 4. Rename `c.ts` back to `a.ts`.
      // 5. Semantic diagnostics still report an error in `b.ts` that `a.ts` doesn't exist.
      // 6. This is wrong, `a.ts` does exist.
      //
      // If we reload the project, this issue resolves itself.
      //
      // NOTE: reloading the project sends diagnostic events without calling `geterr`.
      // However, it seems to take a while for the diagnostics to be sent, so we still
      // request it below.
      //
      tsserver.reloadProjects();
    }

    requestAllDiagnostics(tsserver, session);
  }
}

async function cellDelete(payload: CellDeletePayloadType) {
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

  if (cell.type !== 'markdown' && cell.type !== 'code') {
    throw new Error(`Cannot delete cell of type '${cell.type}'`);
  }

  const updatedCells = removeCell(session, cell.id);

  const updatedSession = await updateSession(session, { cells: updatedCells });

  if (cell.type === 'code') {
    removeCodeCellFromDisk(updatedSession.dir, cell.filename);

    if (updatedSession.metadata.language === 'typescript' && tsservers.has(updatedSession.id)) {
      const file = pathToCodeFile(updatedSession.dir, cell.filename);
      const tsserver = tsservers.get(updatedSession.id);
      tsserver.close({ file });
      requestAllDiagnostics(tsserver, updatedSession);
    }
  }
}

/**
 * Request async diagnostics for all files in the project.
 */
function requestAllDiagnostics(tsserver: TsServer, session: SessionType, delay = 0) {
  const codeCells = session.cells.filter((cell) => cell.type === 'code') as CodeCellType[];
  const files = codeCells.map((cell) => pathToCodeFile(session.dir, cell.filename));
  tsserver.geterr({ files, delay });
}

function createTsServer(session: SessionType) {
  const tsserver = tsservers.create(session.id, { cwd: session.dir });

  const sessionId = session.id;

  tsserver.onSemanticDiag(async (event) => {
    const eventBody = event.body;

    // Get most recent session state
    const session = await findSession(sessionId);

    if (!eventBody || !session) {
      return;
    }

    const filename = filenameFromPath(eventBody.file);
    const cells = session.cells.filter((cell) => cell.type === 'code') as CodeCellType[];
    const cell = cells.find((c) => c.filename === filename);

    if (!cell) {
      return;
    }

    wss.broadcast(`session:${session.id}`, 'tsserver:cell:diagnostics', {
      cellId: cell.id,
      diagnostics: eventBody.diagnostics.map(normalizeDiagnostic),
    });
  });

  // Open all code cells in tsserver
  for (const cell of session.cells) {
    if (cell.type === 'code') {
      tsserver.open({
        file: pathToCodeFile(session.dir, cell.filename),
        fileContent: cell.source,
      });
    }
  }

  return tsserver;
}

async function tsserverStart(payload: TsServerStartPayloadType) {
  const session = await findSession(payload.sessionId);

  if (!session) {
    throw new Error(`No session exists for session '${payload.sessionId}'`);
  }

  if (session.metadata.language !== 'typescript') {
    throw new Error(`tsserver can only be used with TypeScript Srcbooks.`);
  }

  requestAllDiagnostics(
    tsservers.has(session.id) ? tsservers.get(session.id) : createTsServer(session),
    session,
  );
}

async function tsserverStop(payload: TsServerStopPayloadType) {
  tsservers.shutdown(payload.sessionId);
}

wss
  .channel('session:*')
  .incoming('cell:exec', CellExecPayloadSchema, cellExec)
  .incoming('cell:stop', CellStopPayloadSchema, cellStop)
  .incoming('cell:update', CellUpdatePayloadSchema, cellUpdate)
  .incoming('cell:delete', CellDeletePayloadSchema, cellDelete)
  .incoming('deps:install', DepsInstallPayloadSchema, depsInstall)
  .incoming('deps:validate', DepsValidatePayloadSchema, depsValidate)
  .incoming('tsserver:start', TsServerStartPayloadSchema, tsserverStart)
  .incoming('tsserver:stop', TsServerStopPayloadSchema, tsserverStop)
  .outgoing('cell:updated', CellUpdatedPayloadSchema)
  .outgoing('cell:error', CellErrorPayloadSchema)
  .outgoing('cell:output', CellOutputPayloadSchema)
  .outgoing('deps:validate:response', DepsValidateResponsePayloadSchema)
  .outgoing('tsserver:cell:diagnostics', TsServerCellDiagnosticsPayloadSchema);

export default wss;
