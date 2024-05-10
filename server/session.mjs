import vm from 'vm';
import { read } from './jsmd.mjs';
import { randomid } from './utils.mjs';

const sessions = {};

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

export function exec(session, cell, code) {
  const result = vm.runInContext(code, session.context);
  const input = { text: code };
  const output = { result: result };
  return updateCodeCell(cell, { input, output });
}

export function findCell(session, id) {
  return session.cells.find((cell) => cell.id === id);
}

export function replaceCell(session, cell) {
  return session.cells.map((c) => (c.id === cell.id ? cell : c));
}

function updateCodeCell(cell, updates) {
  const updatedInput = updates.input || {};
  const updatedOutput = updates.output || {};
  const input = { ...cell.input, ...updatedInput };
  const output = { ...cell.output, ...updatedOutput };
  return { ...cell, input, output };
}
