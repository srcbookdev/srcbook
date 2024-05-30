import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import type { WebSocket as WsWebSocketType } from 'ws';
import {
  createSession,
  findSession,
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
import { node, npmInstall } from './exec.mjs';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server: server });

// move me
async function doNode(
  ws: WsWebSocketType,
  session: SessionType,
  cell: CodeCellType,
  message: { source: string },
) {
  const updatedCell = { ...cell, source: message.source };
  const updatedCells = replaceCell(session, updatedCell);
  await updateSession(session, { cells: updatedCells });

  const secrets = await getSecrets();

  node({
    cwd: session.dir,
    env: secrets,
    entry: updatedCell.filename,
    stdout(data) {
      const event = {
        type: 'cell:output',
        message: {
          cellId: updatedCell.id,
          output: { type: 'stdout', data: data.toString('utf8') },
        },
      };
      ws.send(JSON.stringify(event));
    },
    stderr(data) {
      const event = {
        type: 'cell:output',
        message: {
          cellId: updatedCell.id,
          output: { type: 'stderr', data: data.toString('utf8') },
        },
      };
      ws.send(JSON.stringify(event));
    },
    onExit(code) {
      const event = {
        type: 'cell:exited',
        message: {
          cellId: updatedCell.id,
          code: code,
        },
      };
      ws.send(JSON.stringify(event));
    },
  });
}

async function doNPMInstall(
  ws: WsWebSocketType,
  session: SessionType,
  cell: PackageJsonCellType,
  message: { source?: string; package?: string },
) {
  if (message.source) {
    const updatedCell = { ...cell, source: message.source };
    const updatedCells = replaceCell(session, updatedCell);
    await updateSession(session, { cells: updatedCells });
  }

  npmInstall({
    cwd: session.dir,
    package: message.package,
    stdout(data) {
      const event = {
        type: 'cell:output',
        message: {
          cellId: cell.id,
          output: { type: 'stdout', data: data.toString('utf8') },
        },
      };
      ws.send(JSON.stringify(event));
    },
    stderr(data) {
      const event = {
        type: 'cell:output',
        message: {
          cellId: cell.id,
          output: { type: 'stderr', data: data.toString('utf8') },
        },
      };
      ws.send(JSON.stringify(event));
    },
    async onExit(code) {
      const updatedJsonSource = await readPackageJsonContentsFromDisk(session);
      const updatedCell = { ...cell, source: updatedJsonSource };
      updateSession(session, { cells: replaceCell(session, updatedCell) }, false);

      const updatedEvent = {
        type: 'cell:updated',
        message: { cell: updatedCell },
      };

      ws.send(JSON.stringify(updatedEvent));

      const exitEvent = {
        type: 'cell:exited',
        message: {
          cellId: updatedCell.id,
          code: code,
        },
      };

      ws.send(JSON.stringify(exitEvent));
    },
  });
}

async function doExec(ws: WsWebSocketType, message: any) {
  const session = await findSession(message.sessionId);
  const cell = findCell(session, message.cellId);

  if (!cell) {
    return;
  }

  switch (cell.type) {
    case 'code':
      return doNode(ws, session, cell, message);
    case 'package.json':
      return doNPMInstall(ws, session, cell, message);
    default:
      throw new Error(`Cannot execute cell of type '${cell.type}'`);
  }
}

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(message) {
    const payload: { type: string; message: any } = JSON.parse(message.toString('utf8'));

    switch (payload.type) {
      case 'cell:exec':
        doExec(ws, payload.message);
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
