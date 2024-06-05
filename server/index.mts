import http from 'node:http';
import { ChildProcess } from 'node:child_process';
import express from 'express';
import cors from 'cors';
import {
  createSession,
  findSession,
  deleteSession,
  exportSession,
  findCell,
  replaceCell,
  removeCell,
  updateSession,
  sessionToResponse,
  listSessions,
  insertCellAt,
  readPackageJsonContentsFromDisk,
} from './session.mjs';
import { disk, take } from './utils.mjs';
import { getConfig, saveConfig, getSecrets, addSecret, removeSecret } from './config.mjs';
import type {
  CellType,
  MarkdownCellType,
  CodeCellType,
  SessionType,
  PackageJsonCellType,
} from './types';
import { node, npmInstall, shouldNpmInstall, missingUndeclaredDeps } from './exec.mjs';
import processes from './processes.mjs';
import WebSocketServer from './web-socket-server.mjs';
import z from 'zod';

const CellExecPayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
});

const CellStopPayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
});

const CellUpdatedPayloadSchema = z.object({
  cell: z.any(), // TODO: TYPE ME
});

const CellOutputPayloadSchema = z.object({
  cellId: z.string(),
  output: z.object({
    type: z.enum(['stdout', 'stderr']),
    data: z.string(),
  }),
});

const DepsInstallPayloadSchema = z.object({
  sessionId: z.string(),
  packages: z.array(z.string()).optional(),
});

const DepsOutdatedPayloadSchema = z.object({
  packages: z.array(z.string()).optional(),
});

const CellValidatePayloadSchema = z.object({
  cellId: z.string(),
  sessionId: z.string(),
  filename: z.string(),
});

const CellValidateResponsePayloadSchema = z.object({
  cellId: z.string(),
  filename: z.string(),
  error: z.boolean(),
  message: z.string().optional(),
});

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
  if (shouldNpmInstall(session.dir)) {
    wss.broadcast(`session:${session.id}`, 'deps:outdated', {});
  }
  const missingDeps = await missingUndeclaredDeps(session.dir);
  if (missingDeps.length > 0) {
    wss.broadcast(`session:${session.id}`, 'deps:outdated', { packages: missingDeps });
  }
}

async function cellExec(payload: z.infer<typeof CellExecPayloadSchema>) {
  const session = await findSession(payload.sessionId);
  const cell = findCell(session, payload.cellId);

  if (!cell || cell.type !== 'code') {
    console.error(`Cannot execute cell with id ${payload.cellId}; cell not found.`);
    return;
  }

  try {
    nudgeMissingDeps(wss, session);
  } catch (e) {
    // If dep check fails, just log the error and continue
    console.error(e);
  }

  const secrets = await getSecrets();

  cell.status = 'running';

  addRunningProcess(
    session,
    cell,
    node({
      cwd: session.dir,
      env: secrets,
      entry: cell.filename,
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
        cell.status = 'idle';
        wss.broadcast(`session:${session.id}`, 'cell:updated', { cell: cell });
      },
    }),
  );
}

async function depsInstall(payload: z.infer<typeof DepsInstallPayloadSchema>) {
  const session = await findSession(payload.sessionId);
  const cell = session.cells.find(
    (cell) => cell.type === 'package.json',
  ) as PackageJsonCellType | void;

  if (!cell) {
    console.error(`Cannot install deps; package.json cell not found`);
    return;
  }

  cell.status = 'running';

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

async function filenameCheck(payload: z.infer<typeof CellValidatePayloadSchema>) {
  const session = await findSession(payload.sessionId);
  const result = validateFilename(session, payload.cellId, payload.filename);
  wss.broadcast(`session:${payload.sessionId}`, 'cell:validate:response', {
    cellId: payload.cellId,
    filename: payload.filename,
    error: typeof result === 'string',
    // Fix this typing... once we delete the web handler also using validateFilename
    message: result === true ? undefined : result,
  });
}

async function cellStop(payload: z.infer<typeof CellStopPayloadSchema>) {
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

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss
  .channel('session:*')
  .incoming('cell:exec', CellExecPayloadSchema, cellExec)
  .incoming('cell:stop', CellStopPayloadSchema, cellStop)
  .incoming('deps:install', DepsInstallPayloadSchema, depsInstall)
  .incoming('cell:validate', CellValidatePayloadSchema, filenameCheck)
  .outgoing('cell:updated', CellUpdatedPayloadSchema)
  .outgoing('cell:output', CellOutputPayloadSchema)
  .outgoing('deps:outdated', DepsOutdatedPayloadSchema)
  .outgoing('cell:validate:response', CellValidateResponsePayloadSchema);

app.use(express.json());

app.options('/disk', cors());

app.post('/disk', cors(), async (req, res) => {
  let { dirname } = req.body;

  try {
    const config = await getConfig();
    dirname = dirname || config.baseDir;
    const entries = await disk(dirname, '.srcmd');
    return res.json({ error: false, result: { dirname, entries } });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

app.options('/sessions', cors());

app.post('/sessions', cors(), async (req, res) => {
  const { dirname, title } = req.body;

  try {
    const session = await createSession({ dirname, title });
    return res.json({ error: false, result: sessionToResponse(session) });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

app.get('/sessions', cors(), async (_req, res) => {
  const sessions = await listSessions();
  return res.json({ error: false, result: Object.values(sessions).map(sessionToResponse) });
});

app.options('/sessions/:id', cors());

app.get('/sessions/:id', cors(), async (req, res) => {
  const { id } = req.params;

  try {
    const session = await findSession(id);
    return res.json({ error: false, result: sessionToResponse(session) });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});
app.delete('/sessions/:id', cors(), async (req, res) => {
  try {
    const session = await findSession(req.params.id);
    await deleteSession(session);
    return res.json({ error: false, result: true });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

app.options('/sessions/:id/export', cors());
app.post('/sessions/:id/export', cors(), async (req, res) => {
  const { filename } = req.body;
  const session = await findSession(req.params.id);

  try {
    await exportSession(session, filename);
    return res.json({ error: false, result: filename });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

app.options('/sessions/:id/cells', cors());
// Create a new cell. If no index is provided, append to the end, otherwise insert at the index
app.post('/sessions/:id/cells', cors(), async (req, res) => {
  const { id } = req.params;
  const { cell, index } = req.body as { cell: CodeCellType | MarkdownCellType; index: number };

  if (cell.type !== 'code' && cell.type !== 'markdown') {
    return res
      .status(400)
      .json({ error: true, message: 'Cell must be either a code cell or markdown cell' });
  }

  // First 2 cells are reserved (title and package.json)
  if (typeof index !== 'number' || index < 2) {
    return res.status(400).json({ error: true, message: 'Index is required' });
  }

  const session = await findSession(id);
  const updatedCells = insertCellAt(session, cell, index);
  updateSession(session, { cells: updatedCells });
  return res.json({ error: false, result: cell });
});

function validateFilename(session: SessionType, cellId: string, filename: string) {
  const validFormat = /^[a-zA-Z0-9_-]+\.(mjs|json)$/.test(filename);

  if (!validFormat) {
    return 'Invalid filename: must consist of letters, numbers, underscores, dashes and must end with mjs or json';
  }

  const codeCells = session.cells.filter((c) => c.type === 'code') as CodeCellType[];
  const unique = !codeCells.some((cell) => {
    // If a different cell with the same filename exists,
    // this is not a unique filename within the session.
    return cell.id !== cellId && cell.filename === filename;
  });

  if (!unique) {
    return 'Invalid filename: filename is not unique';
  }

  return true;
}

app.options('/sessions/:id/cells/:cellId', cors());

app.delete('/sessions/:id/cells/:cellId', cors(), async (req, res) => {
  const { id, cellId } = req.params;
  const session = await findSession(id);
  const cell = findCell(session, cellId);

  if (!cell) {
    return res.status(404).json({ error: true, message: 'Cell not found' });
  }

  if (cell.type === 'title') {
    res.status(400).json({ error: true, message: 'Cannot delete title cell' });
  }

  const updatedCells = removeCell(session, cellId);
  updateSession(session, { cells: updatedCells });

  return res.json({ result: updatedCells });
});

// updates cell without running it
app.post('/sessions/:id/cells/:cellId', cors(), async (req, res) => {
  const { id, cellId } = req.params;
  const attrs = req.body;

  const session = await findSession(id);
  const cell = findCell(session, cellId);

  if (!cell) {
    return res.status(404).json({ error: true, message: 'Cell not found' });
  }

  if (cell.type === 'code' && typeof attrs.filename === 'string') {
    const filenameResult = validateFilename(session, cellId, attrs.filename);

    if (typeof filenameResult === 'string') {
      return res.status(400).json({ error: true, message: filenameResult });
    }
  }

  const updatedCell: CellType = {
    ...cell,
    ...take(attrs, 'source', 'filename', 'text'),
  };

  const updatedCells = replaceCell(session, updatedCell);

  // Update state
  updateSession(session, { cells: updatedCells });

  return res.json({ result: updatedCell });
});

app.options('/settings', cors());

app.get('/settings', cors(), async (_req, res) => {
  const config = await getConfig();
  return res.json({ error: false, result: config });
});

app.post('/settings', cors(), async (req, res) => {
  const body = req.body;
  const config = await getConfig();
  const newConfig = Object.assign({}, config, body);
  await saveConfig(newConfig);

  return res.json({ result: newConfig });
});

app.options('/secrets', cors());

app.get('/secrets', cors(), async (_req, res) => {
  const secrets = await getSecrets();
  return res.json({ result: secrets });
});

// Create a new secret
app.post('/secrets', cors(), async (req, res) => {
  const { name, value } = req.body;
  await addSecret(name, value);
  const secrets = await getSecrets();
  return res.json({ result: secrets });
});

app.options('/secrets/:name', cors());

app.post('/secrets/:name', cors(), async (req, res) => {
  const { name } = req.params;
  const { name: newName, value } = req.body;
  await removeSecret(name);
  await addSecret(newName, value);
  const secrets = await getSecrets();
  return res.json({ result: secrets });
});

app.delete('/secrets/:name', cors(), async (req, res) => {
  const { name } = req.params;
  await removeSecret(name);
  const secrets = await getSecrets();
  return res.json({ result: secrets });
});

app.options('/node_version', cors());
app.get('/node_version', cors(), async (_req, res) => {
  return res.json({ result: process.version });
});

type NpmSearchResult = {
  package: {
    name: string;
    version: string;
    description: string;
  };
};

/*
 * Search for npm packages for a given query.
 * Returns the name, version and description of the packages.
 * Consider debouncing calls to this API on the client side.
 */
app.options('/npm/search', cors());
app.get('/npm/search', cors(), async (req, res) => {
  const { q } = req.query;
  const response = await fetch(`https://registry.npmjs.org/-/v1/search?text=${q}&size=10`);
  if (!response.ok) {
    return res.json({ error: true, result: [] });
  }
  const packages = await response.json();
  const results = packages.objects.map((o: NpmSearchResult) => {
    return { name: o.package.name, version: o.package.version, description: o.package.description };
  });
  return res.json({ result: results });
});

const port = process.env.PORT || 2150;
server.listen(port, () => console.log(`Server running on port ${port}`));
