import express from 'express';
import cors from 'cors';
import {
  createSession,
  findSession,
  exec,
  findCell,
  replaceCell,
  removeCell,
  updateSession,
  sessionToResponse,
  createCell,
  maybeWriteToFile,
} from './session.mjs';
import { disk, take } from './utils.mjs';
import { getConfig, saveConfig } from './config.mjs';

const app = express();
app.use(express.json());

app.options('/disk', cors());

app.post('/disk', cors(), async (req, res) => {
  let { path, includeHidden } = req.body;

  try {
    const config = await getConfig();
    path = path || config.baseDir;
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
  const updatedCell = await exec(session, cell, source);
  const updatedCells = replaceCell(session, updatedCell);

  // Update state
  updateSession(session, { cells: updatedCells });

  return res.json({ result: updatedCell });
});

app.options('/sessions/:id/cells', cors());

// Create a new cell. If no index is provided, append to the end, otherwise insert at the index
app.post('/sessions/:id/cells', cors(), async (req, res) => {
  const { id } = req.params;
  const { type, index } = req.body;

  try {
    const session = await findSession(id);
    let cells = session.cells;
    const cell = createCell({ type });
    if (!index) {
      // No index provided, append to the end
      cells = session.cells.concat(cell);
    } else {
      cells.splice(index, 0, cell);
    }
    updateSession(session, { cells });
    maybeWriteToFile(session);
    return res.json({ error: false, result: cell });
  } catch (error) {
    console.error(error);
    return res.json({ error: true, result: error.stack });
  }
});

function validateFilename(session, cellId, filename) {
  const validFormat = /^[a-zA-Z0-9_-]+\.(mjs|json)$/.test(filename);

  if (!validFormat) {
    return 'Invalid filename: filename must consist of letters, numbers, underscores, dashes and must end with mjs or json';
  }

  const unique = session.cells.some((cell) => {
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
  maybeWriteToFile(session);

  return res.json({ result: updatedCells });
});

// updates cell without running it
app.post('/sessions/:id/cells/:cellId', cors(), async (req, res) => {
  const { id, cellId } = req.params;
  const attrs = req.body;

  const session = await findSession(id);
  const cell = findCell(session, cellId);

  if (cell.type === 'code') {
    const filenameResult = validateFilename(session, cellId, attrs.filename);

    if (typeof filenameResult === 'string') {
      return res.status(400).json({ error: true, message: filenameResult });
    }
  }

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
  maybeWriteToFile(session);

  return res.json({ result: updatedCell });
});

app.options('/settings', cors());

app.get('/settings', cors(), async (_req, res) => {
  const config = await getConfig();
  return res.json({ error: false, result: config });
});

// updates cell without running it
app.post('/settings', cors(), async (req, res) => {
  const body = req.body;
  const config = await getConfig();
  const newConfig = Object.assign({}, config, body);
  await saveConfig(newConfig);

  return res.json({ result: newConfig });
});

const port = process.env.PORT || 2150;
app.listen(port, () => console.log(`Server running on port ${port}`));
