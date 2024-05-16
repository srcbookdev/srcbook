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
  createCell,
} from './session.mjs';
import { disk, take } from './utils.mjs';

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
  const { path, new: newSession } = req.body;

  try {
    const session = await createSession({ path, new: newSession });
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
  const { source, cellId } = req.body;

  const session = await findSession(id);

  const cell = findCell(session, cellId);
  const updatedCell = exec(session, cell, source);
  const updatedCells = replaceCell(session, updatedCell);

  // Update state
  updateSession(session, { cells: updatedCells });

  return res.json({ result: updatedCell });
});

app.options('/sessions/:id/cells', cors());

app.post('/sessions/:id/cells', cors(), async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  try {
    const session = await findSession(id);
    const cell = createCell({ type });
    const cells = session.cells.concat(cell);
    updateSession(session, { cells });
    return res.json({ error: false, result: cell });
  } catch (error) {
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

app.options('/sessions/:id/cells/:cellId', cors());

// updates cell without running it
app.post('/sessions/:id/cells/:cellId', cors(), async (req, res) => {
  const { id, cellId } = req.params;
  const attrs = req.body;

  const session = await findSession(id);
  const cell = findCell(session, cellId);

  const updatedCell = {
    ...cell,
    ...take(attrs, 'source', 'filename', 'text'),
  };

  if (cell.type === 'code') {
    updatedCell.stale = true;
  }

  const updatedCells = replaceCell(session, updatedCell);

  // Update state
  updateSession(session, { cells: updatedCells });

  return res.json({ result: updatedCell });
});

const port = process.env.PORT || 2150;
app.listen(port, () => console.log(`Server running on port ${port}`));
