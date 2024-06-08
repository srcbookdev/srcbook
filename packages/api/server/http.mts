import Path from 'node:path';
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
} from '../session.mjs';
import { disk, take } from '../utils.mjs';
import { getConfig, updateConfig, getSecrets, addSecret, removeSecret } from '../config.mjs';
import type { CellType, MarkdownCellType, CodeCellType } from '../types';
import { validateFilename } from './shared.mjs';
import { createNewSrcbook, importSrcbookFromSrcmdFile } from '../srcbook.mjs';
import { readdir } from '../fs-utils.mjs';

const app = express();

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

// Create a new srcbook
app.options('/srcbooks', cors());
app.post('/srcbooks', cors(), async (req, res) => {
  const { name } = req.body;
  const { baseDir } = await getConfig();

  try {
    const srcbookDir = await createNewSrcbook(baseDir, name);
    return res.json({ error: false, result: { name, path: srcbookDir } });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

// Import a srcbook from a .srcmd file.
app.options('/import', cors());
app.post('/import', cors(), async (req, res) => {
  const { path } = req.body;

  if (Path.extname(path) !== '.srcmd') {
    return res.json({ error: true, result: 'Importing only works with .srcmd files' });
  }

  const name = Path.basename(path).replace('.srcmd', '');

  const { baseDir } = await getConfig();

  try {
    const srcbookDir = await importSrcbookFromSrcmdFile(path, baseDir, name);
    return res.json({ error: false, result: { name, dir: srcbookDir } });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

// Open an existing srcbook by passing a path to the srcbook's directory
app.options('/sessions', cors());
app.post('/sessions', cors(), async (req, res) => {
  const { path } = req.body;

  const dir = await readdir(path);

  if (!dir.exists) {
    return res.json({ error: true, result: `${path} is not a srcbook directory` });
  }

  try {
    const session = await createSession(path);
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
  const updated = await updateConfig(req.body);
  return res.json({ result: updated });
});

app.options('/secrets', cors());

app.get('/secrets', cors(), async (_req, res) => {
  const secrets = await getSecrets();
  return res.json({ result: secrets });
});

// Create a new secret
app.post('/secrets', cors(), async (req, res) => {
  const { name, value } = req.body;
  const updated = await addSecret(name, value);
  return res.json({ result: updated });
});

app.options('/secrets/:name', cors());

app.post('/secrets/:name', cors(), async (req, res) => {
  const { name } = req.params;
  const { name: newName, value } = req.body;
  await removeSecret(name);
  const updated = await addSecret(newName, value);
  return res.json({ result: updated });
});

app.delete('/secrets/:name', cors(), async (req, res) => {
  const { name } = req.params;
  const updated = await removeSecret(name);
  return res.json({ result: updated });
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

export default app;
