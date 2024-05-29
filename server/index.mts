import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import {
  createSession,
  findSession,
  exportSession,
  execCell,
  findCell,
  replaceCell,
  removeCell,
  updateSession,
  sessionToResponse,
  listSessions,
  readPackageJsonContentsFromDisk,
  installPackage,
  createCell,
  insertCellAt,
} from './session.mjs';
import { disk, take, combineOutputs } from './utils.mjs';
import { CellType, type CodeCellType, type SessionType } from './types';
import { getConfig, saveConfig, getSecrets, addSecret, removeSecret } from './config.mjs';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server: server });

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(message) {
    const payload: { type: string; message: any } = JSON.parse(message.toString('utf8'));

    switch (payload.type) {
      case 'cell:exec':
        async function doExec(message: { sessionId: string; cellId: string; source: string }) {
          const session = await findSession(message.sessionId);
          const cell = findCell(session, message.cellId);
          if (!cell || cell.type !== 'code') {
            return;
          }

          const updatedCell = { ...cell, source: message.source };
          const updatedCells = replaceCell(session, updatedCell);
          updateSession(session, { cells: updatedCells });

          const { output } = await execCell(session, updatedCell);

          // Update state
          const resultingCell = { ...cell, output: output };
          updateSession(session, { cells: replaceCell(session, resultingCell) });

          ws.send(JSON.stringify({ type: 'cell:exec', message: { cell: resultingCell } }));
        }
        doExec(payload.message);
        break;
      case 'cell:exec:package.json':
        async function npmInstall(message: { sessionId: string; cellId: string; source: string }) {
          const session = await findSession(message.sessionId);
          const cell = findCell(session, message.cellId);
          ws.send(
            JSON.stringify({ type: 'cell:exec:package.json', message: { it: 'works', cell } }),
          );
        }
        npmInstall(payload.message);
        break;
      default:
        console.log('Unknown message type', payload.type);
    }
  });
});

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
  const sessions = listSessions();
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

app.options('/sessions/:id/exec', cors());

app.post('/sessions/:id/exec', cors(), async (req, res) => {
  const { id } = req.params;
  const { source, cellId } = req.body;

  const session = await findSession(id);

  const cell = findCell(session, cellId);

  if (!cell) {
    return res.status(404).json({ error: true, message: 'Cell not found' });
  }

  if (cell.type !== 'code') {
    return res
      .status(404)
      .json({ error: true, message: `Cannot execute cell of type '${cell.type}'` });
  }

  const updatedCell = { ...cell, source: source };
  const updatedCells = replaceCell(session, updatedCell);
  updateSession(session, { cells: updatedCells });

  const { output } = await execCell(session, updatedCell);

  // Update state
  const resultingCell = { ...cell, output: output };
  updateSession(session, { cells: replaceCell(session, resultingCell) });

  return res.json({ result: resultingCell });
});

app.options('/sessions/:id/npm/install', cors());
app.post('/sessions/:id/npm/install', cors(), async (req, res) => {
  const { id } = req.params;
  const { packageName } = req.body;
  const session = await findSession(id);

  const { exitCode, output } = await installPackage(session, packageName);

  if (exitCode !== 0) {
    return res.status(400).json({ error: true, message: output });
  }

  // Refresh the state of the package.json cell on the sessions object.
  const cell = session.cells.filter((c) => c.type === 'package.json')[0];
  if (!cell) {
    return res.status(400).json({ error: true, message: 'package.json cell not found' });
  }
  const updatedJsonSource = await readPackageJsonContentsFromDisk(session);
  const updatedCell = { ...cell, source: updatedJsonSource };
  updateSession(session, { cells: replaceCell(session, updatedCell) });
  return res.json({ result: combineOutputs(output) });
});

app.options('/sessions/:id/cells', cors());
// Create a new cell. If no index is provided, append to the end, otherwise insert at the index
app.post('/sessions/:id/cells', cors(), async (req, res) => {
  const { id } = req.params;
  const { type, index } = req.body as { type: string; index: number };

  if (type !== 'code' && type !== 'markdown') {
    return res.status(400).json({ error: true, message: 'A type is required' });
  }

  // First 2 cells are reserved (title and package.json)
  if (typeof index !== 'number' || index < 2) {
    return res.status(400).json({ error: true, message: 'Index is required' });
  }

  try {
    const session = await findSession(id);
    const cell = createCell({ type });
    const updatedCells = insertCellAt(session, cell, index);
    updateSession(session, { cells: updatedCells });
    return res.json({ error: false, result: cell });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

function validateFilename(session: SessionType, cellId: string, filename: string) {
  const validFormat = /^[a-zA-Z0-9_-]+\.(mjs|json)$/.test(filename);

  if (!validFormat) {
    return 'Invalid filename: filename must consist of letters, numbers, underscores, dashes and must end with mjs or json';
  }

  const codeCells = session.cells.filter((c) => c.type === 'code') as CodeCellType[];
  const unique = codeCells.some((cell) => {
    // If a different cell with the same filename exists,
    // this is not a unique filename within the session.
    return cell.id === cellId || cell.filename !== filename;
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
