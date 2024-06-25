import Path from 'node:path';
import fs from 'node:fs/promises';
import { SRCBOOKS_DIR } from '../constants.mjs';
import express, { type Application } from 'express';
import cors from 'cors';
import type { MarkdownCellType, CodeCellType } from '@srcbook/shared';
import {
  createSession,
  findSession,
  deleteSessionByDirname,
  exportSrcmdFile,
  findCell,
  removeCell,
  updateSession,
  sessionToResponse,
  listSessions,
  insertCellAt,
} from '../session.mjs';
import { disk } from '../utils.mjs';
import { getConfig, updateConfig, getSecrets, addSecret, removeSecret } from '../config.mjs';
import {
  createSrcbook,
  removeSrcbook,
  fullSrcbookDir,
  importSrcbookFromSrcmdFile,
  importSrcbookFromSrcmdText,
} from '../srcbook.mjs';
import { readdir } from '../fs-utils.mjs';
import { EXAMPLE_SRCBOOKS } from '../srcbooks/examples.mjs';

const app: Application = express();

const router = express.Router();

router.use(express.json());

router.options('/disk', cors());

router.post('/disk', cors(), async (req, res) => {
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

router.options('/examples', cors());
router.get('/examples', cors(), (_, res) => {
  return res.json({ result: EXAMPLE_SRCBOOKS });
});

// Create a new srcbook
router.options('/srcbooks', cors());
router.post('/srcbooks', cors(), async (req, res) => {
  const { name, language } = req.body;

  // TODO: Zod
  if (typeof name !== 'string' || name.length < 1 || name.length > 44 || name.trim() === '') {
    return res.json({
      error: true,
      result: 'Srcbook is required and cannot be more than 44 characters',
    });
  }

  try {
    const srcbookDir = await createSrcbook(name, { language });
    return res.json({ error: false, result: { name, path: srcbookDir } });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

router.options('/srcbooks/:dir', cors());
router.delete('/srcbooks/:dir', cors(), async (req, res) => {
  const { dir } = req.params;
  const fullDir = fullSrcbookDir(dir);
  await removeSrcbook(fullDir);
  await deleteSessionByDirname(fullDir);
  return res.json({ error: false, deleted: true });
});

// Import a srcbook from a .srcmd file or srcmd text.
router.options('/import', cors());
router.post('/import', cors(), async (req, res) => {
  const { path, text } = req.body;

  if (path && Path.extname(path) !== '.srcmd') {
    return res.json({ error: true, result: 'Importing only works with .srcmd files' });
  }

  try {
    if (typeof path === 'string') {
      const srcbookDir = await importSrcbookFromSrcmdFile(path);
      return res.json({ error: false, result: { dir: srcbookDir } });
    } else {
      const srcbookDir = await importSrcbookFromSrcmdText(text);
      return res.json({ error: false, result: { dir: srcbookDir } });
    }
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

// Open an existing srcbook by passing a path to the srcbook's directory
router.options('/sessions', cors());
router.post('/sessions', cors(), async (req, res) => {
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

router.get('/sessions', cors(), async (_req, res) => {
  const sessions = await listSessions();
  return res.json({ error: false, result: Object.values(sessions).map(sessionToResponse) });
});

router.options('/sessions/:id', cors());

router.get('/sessions/:id', cors(), async (req, res) => {
  const { id } = req.params;

  try {
    let session = await findSession(id);

    if (!session) {
      // This might be after a server restart, so we should try
      // to see if we have a directory for this sessionId.
      const exists = await fs.stat(Path.join(SRCBOOKS_DIR, id));
      if (exists) {
        session = await createSession(Path.join(SRCBOOKS_DIR, id));
      }
    }
    updateSession(session, { openedAt: Date.now() }, false);
    return res.json({ error: false, result: sessionToResponse(session) });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

router.options('/sessions/:id/export', cors());
router.post('/sessions/:id/export', cors(), async (req, res) => {
  const { directory, filename } = req.body;
  const session = await findSession(req.params.id);

  const path = Path.join(directory, filename);

  try {
    await exportSrcmdFile(session, path);
    return res.json({ error: false, result: filename });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

router.options('/sessions/:id/cells', cors());
// Create a new cell. If no index is provided, append to the end, otherwise insert at the index
router.post('/sessions/:id/cells', cors(), async (req, res) => {
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

router.options('/sessions/:id/cells/:cellId', cors());

router.delete('/sessions/:id/cells/:cellId', cors(), async (req, res) => {
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

router.options('/settings', cors());

router.get('/settings', cors(), async (_req, res) => {
  const config = await getConfig();
  return res.json({ error: false, result: config });
});

router.post('/settings', cors(), async (req, res) => {
  try {
    const updated = await updateConfig(req.body);
    return res.json({ result: updated });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, message: error.stack });
  }
});

router.options('/secrets', cors());

router.get('/secrets', cors(), async (_req, res) => {
  const secrets = await getSecrets();
  return res.json({ result: secrets });
});

// Create a new secret
router.post('/secrets', cors(), async (req, res) => {
  const { name, value } = req.body;
  const updated = await addSecret(name, value);
  return res.json({ result: updated });
});

router.options('/secrets/:name', cors());

router.post('/secrets/:name', cors(), async (req, res) => {
  const { name } = req.params;
  const { name: newName, value } = req.body;
  await removeSecret(name);
  const updated = await addSecret(newName, value);
  return res.json({ result: updated });
});

router.delete('/secrets/:name', cors(), async (req, res) => {
  const { name } = req.params;
  const updated = await removeSecret(name);
  return res.json({ result: updated });
});

router.options('/node_version', cors());
router.get('/node_version', cors(), async (_req, res) => {
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
router.options('/npm/search', cors());
router.get('/npm/search', cors(), async (req, res) => {
  const { q, size } = req.query;
  const response = await fetch(`https://registry.npmjs.org/-/v1/search?text=${q}&size=${size}`);
  if (!response.ok) {
    return res.json({ error: true, result: [] });
  }
  const packages = await response.json();
  const results = packages.objects.map((o: NpmSearchResult) => {
    return { name: o.package.name, version: o.package.version, description: o.package.description };
  });
  return res.json({ result: results });
});

app.use('/api', router);

export default app;
