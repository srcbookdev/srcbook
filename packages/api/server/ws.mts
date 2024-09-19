import { ChildProcess } from 'node:child_process';
import { posthog } from '../posthog-client.mjs';
import { generateCellEdit, fixDiagnostics } from '../ai/generate.mjs';
import {
  findSession,
  findCell,
  replaceCell,
  updateSession,
  readPackageJsonContentsFromDisk,
  updateCell,
  removeCell,
  updateCodeCellFilename,
  addCell,
  formatAndUpdateCodeCell,
} from '../session.mjs';
import { getSecretsAssociatedWithSession } from '../config.mjs';
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
  CellFormatPayloadType,
  TsServerStartPayloadType,
  TsServerStopPayloadType,
  CellDeletePayloadType,
  CellRenamePayloadType,
  CellErrorType,
  CellCreatePayloadType,
  AiGenerateCellPayloadType,
  TsConfigUpdatePayloadType,
  AiFixDiagnosticsPayloadType,
  TsServerQuickInfoRequestPayloadType,
  TsServerDefinitionLocationRequestPayloadType,
} from '@srcbook/shared';
import {
  CellErrorPayloadSchema,
  CellUpdatePayloadSchema,
  CellUpdatedPayloadSchema,
  CellRenamePayloadSchema,
  CellDeletePayloadSchema,
  CellFormatPayloadSchema,
  CellExecPayloadSchema,
  CellStopPayloadSchema,
  AiGenerateCellPayloadSchema,
  AiGeneratedCellPayloadSchema,
  AiFixDiagnosticsPayloadSchema,
  DepsInstallPayloadSchema,
  DepsValidatePayloadSchema,
  CellOutputPayloadSchema,
  DepsValidateResponsePayloadSchema,
  TsServerStartPayloadSchema,
  TsServerStopPayloadSchema,
  TsServerCellDiagnosticsPayloadSchema,
  CellCreatePayloadSchema,
  TsConfigUpdatePayloadSchema,
  TsConfigUpdatedPayloadSchema,
  TsServerCellSuggestionsPayloadSchema,
  TsServerQuickInfoRequestPayloadSchema,
  TsServerQuickInfoResponsePayloadSchema,
  CellFormattedPayloadSchema,
  TsServerDefinitionLocationRequestPayloadSchema,
  TsServerDefinitionLocationResponsePayloadSchema,
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

  // Consider removing sessionId and cellId if cardinality increases costs too much
  posthog.capture({
    event: 'user ran a cell',
    properties: {
      language: cell.language,
      sessionId: session.id,
      cellId: cell.id,
    },
  });

  nudgeMissingDeps(wss, session);

  const secrets = await getSecretsAssociatedWithSession(session.id);

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

  posthog.capture({
    event: 'user installed dependencies',
    properties: {
      sessionId: session.id,
      packages: payload.packages,
    },
  });

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
      async onExit(exitCode) {
        const updatedJsonSource = await readPackageJsonContentsFromDisk(session);

        const updatedCell: PackageJsonCellType = {
          ...cell,
          source: updatedJsonSource,
          status: exitCode === 0 ? 'idle' : 'failed',
        };

        const updatedSession = await updateSession(
          session,
          { cells: replaceCell(session, updatedCell) },
          false,
        );

        wss.broadcast(`session:${updatedSession.id}`, 'cell:updated', { cell: updatedCell });

        if (updatedSession.language === 'typescript') {
          const mustCreateTsServer = !tsservers.has(updatedSession.id);

          // Make sure to handle the following case here:
          //
          // 1. User creates a new typescript Srcbook
          // 3. There is no tsserver running because it relies on the typescript package in the Srcbook's node modules, which are not yet installed.
          // 4. Now that we just installed the dependencies, we need to create a new tsserver instance.
          const tsserver = mustCreateTsServer
            ? createTsServer(updatedSession)
            : tsservers.get(updatedSession.id);

          // Update all code cell diagnostics now that we have new packages available.
          requestAllDiagnostics(tsserver, updatedSession);
        }
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

  posthog.capture({
    event: 'user stopped cell execution',
    properties: {
      sessionId: session.id,
      cellId: cell.id,
      language: cell.language,
    },
  });

  const killed = processes.kill(session.id, cell.id);

  if (!killed) {
    console.error(
      `Attempted to kill process for session ${session.id} and cell ${cell.id} but it didn't die`,
    );
  }
}

async function cellCreate(payload: CellCreatePayloadType) {
  const session = await findSession(payload.sessionId);

  if (!session) {
    throw new Error(`No session exists for session '${payload.sessionId}'`);
  }

  const { index, cell } = payload;

  // TODO: handle potential errors
  await addCell(session, cell, index);

  if (session.language === 'typescript' && cell.type === 'code' && tsservers.has(session.id)) {
    const tsserver = tsservers.get(session.id);

    tsserver.open({
      file: pathToCodeFile(session.dir, cell.filename),
      fileContent: cell.source,
    });

    requestAllDiagnostics(tsserver, session);
  }
}

function sendCellUpdateError(session: SessionType, cellId: string, errors: CellErrorType[]) {
  wss.broadcast(`session:${session.id}`, 'cell:error', {
    sessionId: session.id,
    cellId: cellId,
    errors: errors,
  });

  // Revert the client's optimistic updates with most recent server cell state
  wss.broadcast(`session:${session.id}`, 'cell:updated', {
    cell: findCell(session, cellId),
  });
}

function reopenFileInTsServer(
  tsserver: TsServer,
  session: SessionType,
  file: { closeFilename: string; openFilename: string; source: string },
) {
  // These two are usually the same unless a file is being renamed.
  const closeFilePath = pathToCodeFile(session.dir, file.closeFilename);
  const openFilePath = pathToCodeFile(session.dir, file.openFilename);

  // To update a file in tsserver, close and reopen it. I assume performance of
  // this implementation is worse than calculating diffs and using `change` command
  // (although maybe not since this is not actually reading or writing to disk).
  // However, that requires calculating diffs which is more complex and may also
  // have performance implications, so sticking with the simple approach for now.
  tsserver.close({ file: closeFilePath });
  tsserver.open({ file: openFilePath, fileContent: file.source });
}

async function cellGenerate(payload: AiGenerateCellPayloadType) {
  const session = await findSession(payload.sessionId);
  const cell = session.cells.find((cell) => cell.id === payload.cellId) as CodeCellType;

  posthog.capture({
    event: 'user edited a cell with AI',
    properties: {
      language: cell.language,
      prompt: payload.prompt,
    },
  });

  const result = await generateCellEdit(payload.prompt, session, cell);

  wss.broadcast(`session:${session.id}`, 'ai:generated', {
    cellId: payload.cellId,
    output: result,
  });
}

async function cellFixDiagnostics(payload: AiFixDiagnosticsPayloadType) {
  const session = await findSession(payload.sessionId);
  const cell = findCell(session, payload.cellId) as CodeCellType;

  const result = await fixDiagnostics(session, cell, payload.diagnostics);

  wss.broadcast(`session:${session.id}`, 'ai:generated', {
    cellId: payload.cellId,
    output: result,
  });
}

async function cellFormat(payload: CellFormatPayloadType) {
  const session = await findSession(payload.sessionId);
  if (!session) {
    throw new Error(`No session exists for session '${payload.sessionId}'`);
  }
  const cellBeforeUpdate = findCell(session, payload.cellId);

  if (!cellBeforeUpdate || cellBeforeUpdate.type !== 'code') {
    throw new Error(
      `No cell exists or not a code cell for session '${payload.sessionId}' and cell '${payload.cellId}'`,
    );
  }
  const result = await formatAndUpdateCodeCell(session, cellBeforeUpdate);
  if (!result.success) {
    wss.broadcast(`session:${session.id}`, 'cell:output', {
      cellId: payload.cellId,
      output: { type: 'stderr', data: result.errors },
    });
    sendCellUpdateError(session, payload.cellId, [
      {
        message:
          'An error occurred while formatting the code. Please check stderr for more details.',
        attribute: 'formatting',
      },
    ]);
  } else {
    const cell = result.cell as CodeCellType;

    wss.broadcast(`session:${session.id}`, 'cell:formatted', {
      cellId: payload.cellId,
      cell,
    });

    refreshCodeCellDiagnostics(session, cell);
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
    return sendCellUpdateError(session, payload.cellId, result.errors);
  }

  const cell = result.cell as CodeCellType;

  refreshCodeCellDiagnostics(session, cell);
}

async function cellRename(payload: CellRenamePayloadType) {
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

  if (cellBeforeUpdate.type !== 'code') {
    throw new Error(
      `Cannot rename cell of type '${cellBeforeUpdate.type}'. Only code cells can be renamed.`,
    );
  }

  posthog.capture({
    event: 'user renamed cell',
    properties: {
      sessionId: session.id,
      cellId: cellBeforeUpdate.id,
    },
  });

  const result = await updateCodeCellFilename(session, cellBeforeUpdate, payload.filename);

  if (!result.success) {
    return sendCellUpdateError(session, payload.cellId, result.errors);
  }

  if (
    session.language === 'typescript' &&
    cellBeforeUpdate.type === 'code' &&
    tsservers.has(session.id)
  ) {
    const cellAfterUpdate = result.cell as CodeCellType;
    const tsserver = tsservers.get(session.id);

    // This function is specifically for renaming code cells. Thus,
    // the filenames before and after the update should be different.
    reopenFileInTsServer(tsserver, session, {
      closeFilename: cellBeforeUpdate.filename,
      openFilename: cellAfterUpdate.filename,
      source: cellAfterUpdate.source,
    });

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

  posthog.capture({
    event: 'user deleted cell',
    properties: { cellType: cell.type },
  });

  if (cell.type !== 'markdown' && cell.type !== 'code') {
    throw new Error(`Cannot delete cell of type '${cell.type}'`);
  }

  const updatedCells = removeCell(session, cell.id);

  const updatedSession = await updateSession(session, { cells: updatedCells });

  if (cell.type === 'code') {
    removeCodeCellFromDisk(updatedSession.dir, cell.filename);

    if (updatedSession.language === 'typescript' && tsservers.has(updatedSession.id)) {
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
    if(!eventBody) return

    // Get most recent session state
    let session;
    try{
      session = await findSession(sessionId);
    } catch(e){
      const error = e as unknown as Error
      console.error(error);
      return
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

  tsserver.onSuggestionDiag(async (event) => {
    const eventBody = event.body;
    if(!eventBody) return

    // Get most recent session state
    let session;
    try{
       session = await findSession(sessionId);
    } catch (e){
      const error = e as unknown as Error
      console.error(error)
      return
    }

    const filename = filenameFromPath(eventBody.file);
    const cells = session.cells.filter((cell) => cell.type === 'code') as CodeCellType[];
    const cell = cells.find((c) => c.filename === filename);

    if (!cell) {
      return;
    }

    wss.broadcast(`session:${session.id}`, 'tsserver:cell:suggestions', {
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

  if (session.language !== 'typescript') {
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

async function tsconfigUpdate(payload: TsConfigUpdatePayloadType) {
  const session = await findSession(payload.sessionId);

  if (!session) {
    throw new Error(`No session exists for session '${payload.sessionId}'`);
  }

  posthog.capture({ event: 'user updated tsconfig' });

  const updatedSession = await updateSession(session, { 'tsconfig.json': payload.source });

  if (tsservers.has(updatedSession.id)) {
    const tsserver = tsservers.get(updatedSession.id);
    tsserver.reloadProjects();
    requestAllDiagnostics(tsserver, updatedSession);
  }

  wss.broadcast(`session:${updatedSession.id}`, 'tsconfig.json:updated', {
    source: payload.source,
  });
}

async function tsserverQuickInfo(payload: TsServerQuickInfoRequestPayloadType) {
  const session = await findSession(payload.sessionId);

  if (!session) {
    throw new Error(`No session exists for session '${payload.sessionId}'`);
  }

  if (session.language !== 'typescript') {
    throw new Error(`tsserver can only be used with TypeScript Srcbooks.`);
  }

  const tsserver = tsservers.has(session.id) ? tsservers.get(session.id) : createTsServer(session);

  const cell = session.cells.find((c) => payload.cellId == c.id);

  if (!cell || cell.type !== 'code') {
    throw new Error(`No code cell found for cellId '${payload.cellId}'`);
  }

  const filename = cell.filename;

  const tsserverResponse = await tsserver.quickinfo({
    file: pathToCodeFile(session.dir, filename),
    line: payload.request.location.line,
    offset: payload.request.location.offset,
  });

  const body = tsserverResponse.body;
  if (!body) {
    return null;
  }

  wss.broadcast(`session:${session.id}`, 'tsserver:cell:quickinfo:response', {
    response: {
      ...body,
    },
  });
}

async function getDefinitionLocation(payload: TsServerDefinitionLocationRequestPayloadType) {
  const session = await findSession(payload.sessionId);

  if (!session) {
    throw new Error(`No session exists for session '${payload.sessionId}'`);
  }

  if (session.language !== 'typescript') {
    throw new Error(`tsserver can only be used with TypeScript Srcbooks.`);
  }

  const tsserver = tsservers.has(session.id) ? tsservers.get(session.id) : createTsServer(session);

  const cell = session.cells.find((c) => payload.cellId == c.id);

  if (!cell || cell.type !== 'code') {
    throw new Error(`No code cell found for cellId '${payload.cellId}'`);
  }

  const filename = cell.filename;

  const tsserverResponse = await tsserver.getDefinitionLocation({
    file: pathToCodeFile(session.dir, filename),
    line: payload.request.location.line,
    offset: payload.request.location.offset,
  });

  const body = tsserverResponse.body;
  if (!body) {
    return null;
  }

  const res = {
    response: body[0] ? body[0] : null,
  };

  wss.broadcast(`session:${session.id}`, 'tsserver:cell:definition_location:response', res);
}

function refreshCodeCellDiagnostics(session: SessionType, cell: CodeCellType) {
  if (session.language === 'typescript' && cell.type === 'code' && tsservers.has(session.id)) {
    const tsserver = tsservers.get(session.id);

    // This isn't intended for renaming, so the filenames
    // and their resulting paths are expected to be the same
    reopenFileInTsServer(tsserver, session, {
      openFilename: cell.filename,
      closeFilename: cell.filename,
      source: cell.source,
    });

    requestAllDiagnostics(tsserver, session);
  }
}
wss
  .channel('session:*')
  .incoming('cell:exec', CellExecPayloadSchema, cellExec)
  .incoming('cell:stop', CellStopPayloadSchema, cellStop)
  .incoming('cell:create', CellCreatePayloadSchema, cellCreate)
  .incoming('cell:update', CellUpdatePayloadSchema, cellUpdate)
  .incoming('cell:rename', CellRenamePayloadSchema, cellRename)
  .incoming('cell:delete', CellDeletePayloadSchema, cellDelete)
  .incoming('cell:format', CellFormatPayloadSchema, cellFormat)
  .incoming('ai:generate', AiGenerateCellPayloadSchema, cellGenerate)
  .incoming('ai:fix_diagnostics', AiFixDiagnosticsPayloadSchema, cellFixDiagnostics)
  .incoming('deps:install', DepsInstallPayloadSchema, depsInstall)
  .incoming('deps:validate', DepsValidatePayloadSchema, depsValidate)
  .incoming('tsserver:start', TsServerStartPayloadSchema, tsserverStart)
  .incoming('tsserver:stop', TsServerStopPayloadSchema, tsserverStop)
  .incoming('tsconfig.json:update', TsConfigUpdatePayloadSchema, tsconfigUpdate)
  .incoming(
    'tsserver:cell:quickinfo:request',
    TsServerQuickInfoRequestPayloadSchema,
    tsserverQuickInfo,
  )
  .incoming(
    'tsserver:cell:definition_location:request',
    TsServerDefinitionLocationRequestPayloadSchema,
    getDefinitionLocation,
  )
  .outgoing('tsserver:cell:quickinfo:response', TsServerQuickInfoResponsePayloadSchema)
  .outgoing(
    'tsserver:cell:definition_location:response',
    TsServerDefinitionLocationResponsePayloadSchema,
  )
  .outgoing('cell:updated', CellUpdatedPayloadSchema)
  .outgoing('cell:formatted', CellFormattedPayloadSchema)
  .outgoing('cell:error', CellErrorPayloadSchema)
  .outgoing('cell:output', CellOutputPayloadSchema)
  .outgoing('ai:generated', AiGeneratedCellPayloadSchema)
  .outgoing('deps:validate:response', DepsValidateResponsePayloadSchema)
  .outgoing('tsserver:cell:diagnostics', TsServerCellDiagnosticsPayloadSchema)
  .outgoing('tsserver:cell:suggestions', TsServerCellSuggestionsPayloadSchema)
  .outgoing('tsconfig.json:updated', TsConfigUpdatedPayloadSchema);

export default wss;
