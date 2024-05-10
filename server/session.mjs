import vm from 'vm';
import { read, write } from './jsmd.mjs';
import { randomid } from './utils.mjs';

const sessions = {};

setInterval(() => {
  for (const session of Object.values(sessions)) {
    write(session);
  }
}, 5000);

export async function createSession({ path }) {
  const id = randomid();

  const cells = await read(path);

  sessions[id] = {
    id: id,
    path: path,
    cells: cells,
    context: vm.createContext({}),
  };

  return sessions[id];
}

export async function updateSession(session, updates) {
  const id = session.id;
  sessions[id] = { ...session, ...updates };
  return sessions[id];
}

export async function findSession(id) {
  return sessions[id];
}

export function sessionToResponse(session) {
  return {
    id: session.id,
    path: session.path,
    cells: session.cells,
  };
}

export function createCell({ type }) {
  switch (type) {
    case 'heading':
      return {
        id: randomid(),
        stale: false,
        type: 'heading',
        text: 'Heading',
        depth: 2,
        output: [],
      };
    case 'code':
      return {
        id: randomid(),
        stale: false,
        type: 'code',
        source: '',
        language: 'javascript',
        output: [],
      };
    default:
      throw new Error(`Unrecognized cell type ${type}`);
  }
}

export function exec(session, cell, source) {
  // Make a copy of the cell
  cell = { ...cell, stale: false, source: source, output: [] };

  try {
    const result = vm.runInContext(source, session.context);
    cell.output = [{ type: 'eval', error: false, text: result }];
  } catch (error) {
    console.error(`Error while evaluating Cell(id=${cell.id})`);
    console.error(error);
    cell.output = [{ type: 'eval', error: true, text: error.stack }];
  }

  // Return copy
  return cell;
}

export function findCell(session, id) {
  return session.cells.find((cell) => cell.id === id);
}

export function replaceCell(session, cell) {
  return session.cells.map((c) => (c.id === cell.id ? cell : c));
}
