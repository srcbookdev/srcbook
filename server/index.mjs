import os from 'os';
import express from 'express';
import cors from 'cors';
import {
  createSession,
  findSession,
  exec,
  findCell,
  replaceCell,
  updateSession,
  sessionToResponse,
} from './session.mjs';
import { disk } from './utils.mjs';

const app = express();
app.use(express.json());

app.options('/disk', cors());

app.post('/disk', cors(), async (req, res) => {
  let { path, includeHidden } = req.body;

  try {
    path = path || os.homedir();
    includeHidden = includeHidden || false;
    const entries = await disk(path, includeHidden, '.jsmd');
    return res.json({ error: false, result: { path, entries } });
  } catch (error) {
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

app.options('/sessions', cors());

app.post('/sessions', cors(), async (req, res) => {
  const { path } = req.body;

  try {
    const session = await createSession({ path });
    return res.json({ error: false, result: sessionToResponse(session) });
  } catch (error) {
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

app.options('/sessions/:id', cors());

app.get('/sessions/:id', cors(), async (req, res) => {
  const { id } = req.params;

  try {
    const session = await findSession(id);
    return res.json({ error: false, result: sessionToResponse(session) });
  } catch (error) {
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

app.options('/sessions/:id/exec', cors());

app.post('/sessions/:id/exec', cors(), async (req, res) => {
  const { id } = req.params;
  const { code, cellId } = req.body;

  try {
    const session = await findSession(id);
    let cell = findCell(session, cellId);
    cell = exec(session, cell, code);
    const cells = replaceCell(session, cell);
    updateSession(session, { cells });
    return res.json({ error: false, result: cell });
  } catch (error) {
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

const port = process.env.PORT || 2150;
app.listen(port, () => console.log(`Server running on port ${port}`));
