import Path from 'node:path';
import { posthog } from '../posthog-client.mjs';
import fs from 'node:fs/promises';
import { SRCBOOKS_DIR } from '../constants.mjs';
import express, { type Application, type Response } from 'express';
import cors from 'cors';
import {
  createSession,
  findSession,
  deleteSessionByDirname,
  updateSession,
  sessionToResponse,
  listSessions,
  exportSrcmdText,
} from '../session.mjs';
import { generateCells, generateSrcbook, healthcheck, editApp } from '../ai/generate.mjs';
import { parsePlan } from '../ai/plan-parser.mjs';
import {
  getConfig,
  updateConfig,
  getSecrets,
  addSecret,
  getHistory,
  appendToHistory,
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
  updateSessionEnvTypeDeclarations,
} from '../srcbook/index.mjs';
import { readdir } from '../fs-utils.mjs';
import { EXAMPLE_SRCBOOKS } from '../srcbook/examples.mjs';
import { pathToSrcbook } from '../srcbook/path.mjs';
import { isSrcmdPath } from '../srcmd/paths.mjs';
import {
  loadApps,
  loadApp,
  createApp,
  serializeApp,
  deleteApp,
  createAppWithAi,
  updateApp,
} from '../apps/app.mjs';
import { toValidPackageName } from '../apps/utils.mjs';
import {
  deleteFile,
  renameFile,
  loadDirectory,
  loadFile,
  createFile,
  createDirectory,
  renameDirectory,
  deleteDirectory,
  getFlatFilesForApp,
} from '../apps/disk.mjs';
import { CreateAppSchema } from '../apps/schemas.mjs';
import { AppGenerationFeedbackType } from '@srcbook/shared';

const app: Application = express();

const router = express.Router();

router.use(express.json());

router.options('/file', cors());

router.post('/file', cors(), async (req, res) => {
  const { file } = req.body as {
    file: string;
  };

  try {
    const content = await fs.readFile(file, 'utf8');
    const cell = file.includes('.srcbook/srcbooks') && !file.includes('node_modules');
    const filename = cell ? file.split('/').pop() || file : file;

    return res.json({
      error: false,
      result: {
        content: cell ? '' : content,
        filename,
        type: cell ? 'cell' : 'filepath',
      },
    });
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

router.options('/sessions/:id/export-text', cors());
router.get('/sessions/:id/export-text', cors(), async (req, res) => {
  const session = await findSession(req.params.id);

  posthog.capture({ event: 'user exported srcbook' });

  try {
    const text = exportSrcmdText(session);
    res.setHeader('Content-Type', 'text/markdown');
    res.send(text).end();
    return;
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
  await updateSessionEnvTypeDeclarations(id);
  return res.status(204).end();
});

router.delete('/sessions/:id/secrets/:name', cors(), async (req, res) => {
  const { id, name } = req.params;
  await disassociateSecretWithSession(name, id);
  await updateSessionEnvTypeDeclarations(id);
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

function error500(res: Response, e: Error) {
  const error = e as unknown as Error;
  console.error(error);
  return res.status(500).json({ error: 'An unexpected error occurred.' });
}

router.options('/apps', cors());
router.post('/apps', cors(), async (req, res) => {
  const result = CreateAppSchema.safeParse(req.body);

  if (result.success === false) {
    const errors = result.error.errors.map((error) => error.message);
    return res.status(400).json({ errors });
  }

  const attrs = result.data;

  posthog.capture({
    event: 'user created app',
    properties: { prompt: typeof attrs.prompt === 'string' ? attrs.prompt : 'N/A' },
  });

  try {
    if (typeof attrs.prompt === 'string') {
      const app = await createAppWithAi({ name: attrs.name, prompt: attrs.prompt });
      return res.json({ data: serializeApp(app) });
    } else {
      // TODO do we really need to keep this?
      const app = await createApp(attrs);
      return res.json({ data: serializeApp(app) });
    }
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps', cors());
router.get('/apps', cors(), async (req, res) => {
  const sort = req.query.sort === 'desc' ? 'desc' : 'asc';

  try {
    const apps = await loadApps(sort);
    return res.json({ data: apps.map(serializeApp) });
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps/:id', cors());
router.get('/apps/:id', cors(), async (req, res) => {
  const { id } = req.params;

  try {
    const app = await loadApp(id);

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    return res.json({ data: serializeApp(app) });
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps/:id', cors());
router.put('/apps/:id', cors(), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const app = await updateApp(id, { name });

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    return res.json({ data: serializeApp(app) });
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps/:id', cors());
router.delete('/apps/:id', cors(), async (req, res) => {
  const { id } = req.params;

  try {
    await deleteApp(id);
    return res.json({ deleted: true });
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps/:id/directories', cors());
router.get('/apps/:id/directories', cors(), async (req, res) => {
  const { id } = req.params;

  // TODO: validate and ensure path is not absolute
  const path = typeof req.query.path === 'string' ? req.query.path : '.';

  try {
    const app = await loadApp(id);

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    const directory = await loadDirectory(app, path);

    return res.json({ data: directory });
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps/:id/edit', cors());
router.post('/apps/:id/edit', cors(), async (req, res) => {
  const { id } = req.params;
  const { query, planId } = req.body;
  try {
    const app = await loadApp(id);

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    const validName = toValidPackageName(app.name);
    const files = await getFlatFilesForApp(String(app.externalId));
    const result = await editApp(validName, files, query, id, planId);
    const parsedResult = await parsePlan(result, app, query, planId);
    return res.json({ data: parsedResult });
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps/:id/directories', cors());
router.post('/apps/:id/directories', cors(), async (req, res) => {
  const { id } = req.params;

  // TODO: validate and ensure path is not absolute
  const { dirname, basename } = req.body;

  try {
    const app = await loadApp(id);

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    const directory = await createDirectory(app, dirname, basename);

    return res.json({ data: directory });
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps/:id/directories', cors());
router.delete('/apps/:id/directories', cors(), async (req, res) => {
  const { id } = req.params;

  // TODO: validate and ensure path is not absolute
  const path = typeof req.query.path === 'string' ? req.query.path : '.';

  try {
    const app = await loadApp(id);

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    await deleteDirectory(app, path);

    return res.json({ data: { deleted: true } });
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps/:id/directories/rename', cors());
router.post('/apps/:id/directories/rename', cors(), async (req, res) => {
  const { id } = req.params;

  // TODO: validate and ensure path is not absolute
  const path = typeof req.query.path === 'string' ? req.query.path : '.';
  const name = req.query.name as string;

  try {
    const app = await loadApp(id);

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    const directory = await renameDirectory(app, path, name);

    return res.json({ data: directory });
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps/:id/files', cors());
router.get('/apps/:id/files', cors(), async (req, res) => {
  const { id } = req.params;

  // TODO: validate and ensure path is not absolute
  const path = typeof req.query.path === 'string' ? req.query.path : '.';

  try {
    const app = await loadApp(id);

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    const file = await loadFile(app, path);

    return res.json({ data: file });
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps/:id/files', cors());
router.post('/apps/:id/files', cors(), async (req, res) => {
  const { id } = req.params;

  // TODO: validate and ensure path is not absolute
  const { dirname, basename, source } = req.body;

  try {
    const app = await loadApp(id);

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    const file = await createFile(app, dirname, basename, source);

    return res.json({ data: file });
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps/:id/files', cors());
router.delete('/apps/:id/files', cors(), async (req, res) => {
  const { id } = req.params;

  // TODO: validate and ensure path is not absolute
  const path = typeof req.query.path === 'string' ? req.query.path : '.';

  try {
    const app = await loadApp(id);

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    await deleteFile(app, path);

    return res.json({ data: { deleted: true } });
  } catch (e) {
    return error500(res, e as Error);
  }
});

router.options('/apps/:id/files/rename', cors());
router.post('/apps/:id/files/rename', cors(), async (req, res) => {
  const { id } = req.params;

  // TODO: validate and ensure path is not absolute
  const path = typeof req.query.path === 'string' ? req.query.path : '.';
  const name = req.query.name as string;

  try {
    const app = await loadApp(id);

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    const file = await renameFile(app, path, name);

    return res.json({ data: file });
  } catch (e) {
    return error500(res, e as Error);
  }
});

app.use('/api', router);

export default app;

router.options('/apps/:id/history', cors());
router.get('/apps/:id/history', cors(), async (req, res) => {
  const { id } = req.params;
  const history = await getHistory(id);
  return res.json({ data: history });
});

router.post('/apps/:id/history', cors(), async (req, res) => {
  const { id } = req.params;
  const { messages } = req.body;
  await appendToHistory(id, messages);
  return res.json({ data: { success: true } });
});

router.options('/apps/:id/feedback', cors());
router.post('/apps/:id/feedback', cors(), async (req, res) => {
  const { id } = req.params;
  const { planId, feedback } = req.body as AppGenerationFeedbackType;
  // check for privacy env var SRCBOOK_DISABLE_ANALYTICS and return 403 if true
  if (process.env.SRCBOOK_DISABLE_ANALYTICS === 'true') {
    return res.status(403).json({ error: 'Analytics are disabled' });
  }

  try {
    const response = await fetch('https://hub.srcbook.com/api/app_generation_feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appId: id,
        planId,
        feedback,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return res.json(result);
  } catch (error) {
    console.error('Error sending feedback:', error);
    return res.status(500).json({ error: 'Failed to send feedback' });
  }
});
