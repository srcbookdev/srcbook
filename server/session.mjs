import fs from 'fs/promises';
import Path from 'path';
import util from 'util';
import vm from 'vm';
import { decode, encode } from './jsmd.mjs';
import { randomid, sha256 } from './utils.mjs';

const sessions = {};

setInterval(() => {
  for (const session of Object.values(sessions)) {
    maybeWriteToFile(session);
  }
}, 5000);

async function maybeWriteToFile(session) {
  const contents = encode(session.cells);
  const buffer = Buffer.from(contents);
  const hash = await sha256(new Uint8Array(buffer));
  if (session.hash !== hash) {
    console.log(`Writing to ${session.path}`);
    await fs.writeFile(session.path, contents, { encoding: 'utf8' });
    session.hash = hash;
  }
}

export async function createSession({ path }) {
  if (Path.extname(path) !== '.jsmd') {
    throw new Error(`path argument must be to a .jsmd file but got ${path}`);
  }

  const id = randomid();
  const buffer = await fs.readFile(path);
  const hash = await sha256(new Uint8Array(buffer));
  const contents = buffer.toString();
  const cells = decode(contents);

  sessions[id] = {
    id: id,
    hash: hash,
    path: path,
    cells: cells,
    output: [],
    context: vm.createContext({
      console: {
        log(...args) {
          for (const arg of args) {
            sessions[id].output.push({ type: 'stdout', text: util.inspect(arg) });
          }
          console.log(...args);
        },
        error(...args) {
          for (const arg of args) {
            sessions[id].output.push({ type: 'stderr', text: util.inspect(arg) });
          }
          console.error(...args);
        },
      },
    }),
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
        filename: 'untitled.js',
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
    cell.output = session.output.concat({ type: 'eval', error: false, text: util.inspect(result) });
  } catch (error) {
    console.error(`Error while evaluating Cell(id=${cell.id})`);
    console.error(error);
    cell.output = session.output.concat({ type: 'eval', error: true, text: error.stack });
  }

  session.output = [];

  // Return copy
  return cell;
}

export function findCell(session, id) {
  return session.cells.find((cell) => cell.id === id);
}

export function replaceCell(session, cell) {
  return session.cells.map((c) => (c.id === cell.id ? cell : c));
}
