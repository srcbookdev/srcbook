import Path from 'node:path';
import { posthog } from '../posthog-client.mjs';
import fs from 'node:fs/promises';
import { SRCBOOKS_DIR } from '../constants.mjs';
import express, { type Application } from 'express';
import cors from 'cors';
import {
  createSession,
  findSession,
  deleteSessionByDirname,
  exportSrcmdFile,
  updateSession,
  sessionToResponse,
  listSessions,
} from '../session.mjs';
import { generateCells, generateSrcbook, healthcheck } from '../ai/generate.mjs';
import { disk } from '../utils.mjs';
import {
  getConfig,
  updateConfig,
  getSecrets,
  addSecret,
  removeSecret,
  associateSecretWithSession,
  disassociateSecretWithSession,
} from '../config.mjs';
import {
  createSrcbook,
  removeSrcbook,
  importSrcbookFromSrcmdFile,
  importSrcbookFromSrcmdText,
  importSrcbookFromSrcmdUrl,
} from '../srcbook/index.mjs';
import { readdir } from '../fs-utils.mjs';
import { EXAMPLE_SRCBOOKS } from '../srcbook/examples.mjs';
import { pathToSrcbook } from '../srcbook/path.mjs';
import { isSrcmdPath } from '../srcmd/paths.mjs';

const app: Application = express();

const router = express.Router();

router.use(express.json());

router.options('/disk', cors());

router.post('/disk', cors(), async (req, res) => {
  let { dirname } = req.body;

  try {
    const config = await getConfig();
    dirname = dirname || config.baseDir;
    const entries = await disk(dirname, '.src.md');
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

  posthog.capture({
    event: 'user created srcbook',
    properties: { language },
  });

  try {
    const srcbookDir = await createSrcbook(name, language);
    return res.json({ error: false, result: { name, path: srcbookDir } });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

router.options('/srcbooks/:id', cors());
router.delete('/srcbooks/:id', cors(), async (req, res) => {
  const { id } = req.params;
  const srcbookDir = pathToSrcbook(id);
  removeSrcbook(srcbookDir);
  posthog.capture({ event: 'user deleted srcbook' });
  await deleteSessionByDirname(srcbookDir);
  return res.json({ error: false, deleted: true });
});

// Import a srcbook from a .src.md file or srcmd text.
router.options('/import', cors());
router.post('/import', cors(), async (req, res) => {
  const { path, text, url } = req.body;

  if (typeof path === 'string' && !isSrcmdPath(path)) {
    return res.json({ error: true, result: 'Importing only works with .src.md files' });
  }
  if (typeof url === 'string' && !isSrcmdPath(url)) {
    return res.json({ error: true, result: 'Importing only works with .src.md files' });
  }

  try {
    if (typeof path === 'string') {
      posthog.capture({ event: 'user imported srcbook from file' });
      const srcbookDir = await importSrcbookFromSrcmdFile(path);
      return res.json({ error: false, result: { dir: srcbookDir } });
    } else if (typeof url === 'string') {
      posthog.capture({ event: 'user imported srcbook from url' });
      const srcbookDir = await importSrcbookFromSrcmdUrl(url);
      return res.json({ error: false, result: { dir: srcbookDir } });
    } else {
      posthog.capture({ event: 'user imported srcbook from text' });
      const srcbookDir = await importSrcbookFromSrcmdText(text);
      return res.json({ error: false, result: { dir: srcbookDir } });
    }
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

// Generate a srcbook using AI from a simple string query
router.options('/generate', cors());
router.post('/generate', cors(), async (req, res) => {
  const { query } = req.body;

  try {
    posthog.capture({ event: 'user generated srcbook with AI', properties: { query } });
    const result = await generateSrcbook(query);
    const srcbookDir = await importSrcbookFromSrcmdText(result.text);
    return res.json({ error: false, result: { dir: srcbookDir } });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

// Generate a cell using AI from a query string
router.options('/sessions/:id/generate_cells', cors());
router.post('/sessions/:id/generate_cells', cors(), async (req, res) => {
  // @TODO: zod
  const { insertIdx, query } = req.body;

  try {
    posthog.capture({ event: 'user generated cell with AI', properties: { query } });
    const session = await findSession(req.params.id);
    const { error, errors, cells } = await generateCells(query, session, insertIdx);
    const result = error ? errors : cells;
    return res.json({ error, result });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

// Test that the AI generation is working with the current configuration
router.options('/ai/healthcheck', cors());
router.get('/ai/healthcheck', cors(), async (_req, res) => {
  try {
    const result = await healthcheck();
    return res.json({ error: false, result });
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

  posthog.capture({ event: 'user opened srcbook' });
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

  posthog.capture({ event: 'user exported srcbook' });

  try {
    await exportSrcmdFile(session, path);
    return res.json({ error: false, result: filename });
  } catch (e) {
    const error = e as unknown as Error;
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

router.options('/sessions/:id/secrets/:name', cors());
router.put('/sessions/:id/secrets/:name', cors(), async (req, res) => {
  const { id, name } = req.params;
  await associateSecretWithSession(name, id);
  return res.status(204).end();
});

router.delete('/sessions/:id/secrets/:name', cors(), async (req, res) => {
  const { id, name } = req.params;
  await disassociateSecretWithSession(name, id);
  return res.status(204).end();
});

router.options('/settings', cors());

router.get('/settings', cors(), async (_req, res) => {
  const config = await getConfig();
  return res.json({ error: false, result: config });
});

router.post('/settings', cors(), async (req, res) => {
  try {
    const updated = await updateConfig(req.body);

    posthog.capture({
      event: 'user updated settings',
      properties: { setting_changed: Object.keys(req.body) },
    });

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
  posthog.capture({ event: 'user created secret' });
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

router.options('/feedback', cors());
router.post('/feedback', cors(), async (req, res) => {
  const { feedback, email } = req.body;
  // Every time you modify the appscript here, you'll need to update the URL below
  // @TODO: once we have an env variable setup, we can use that here.
  const url =
    'https://script.google.com/macros/s/AKfycbxPrg8z47SkJnHyoZBYqNtkcH8hBe12f-f2UJJ3PcIHmKdbMMuJuPoOemEB1ib8a_IKCg/exec';

  const result = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ feedback, email }),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  });

  return res.json({ success: result.ok });
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

router.options('/subscribe', cors());
router.post('/subscribe', cors(), async (req, res) => {
  const { email } = req.body;
  const hubResponse = await fetch('https://hub.srcbook.com/api/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (hubResponse.ok) {
    return res.json({ success: true });
  } else {
    return res.status(hubResponse.status).json({ success: false });
  }
});

app.use('/api', router);

export default app;
