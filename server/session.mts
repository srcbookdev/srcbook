import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import Path from 'node:path';
import { encode, decode, newContents } from './srcmd.mjs';
import { randomid, sha256 } from './utils.mjs';

import type { CellType, CodeCellType, MarkdownCellType, SessionType } from './types';

const sessions: Record<string, SessionType> = {};

setInterval(() => {
  for (const session of Object.values(sessions)) {
    maybeWriteToFile(session);
  }
}, 5000);

export async function maybeWriteToFile(session: SessionType) {
  const contents = encode(session.cells);
  const buffer = Buffer.from(contents);
  const hash = await sha256(new Uint8Array(buffer));
  if (session.hash !== hash) {
    await fs.writeFile(session.path, contents, { encoding: 'utf8' });
    session.hash = hash;
  }
}

export async function createSession({ dirname, basename }: { dirname: string; basename: string }) {
  if (typeof dirname !== 'string') {
    throw new Error('Invalid dirname');
  }

  if (typeof basename !== 'string') {
    throw new Error('Invalid basename');
  }

  if (Path.extname(basename) === '') {
    basename += '.srcmd';
  }

  if (Path.extname(basename) !== '.srcmd') {
    throw new Error(`Sessions cannot be created from file types other than .srcmd`);
  }

  const path = Path.join(dirname, basename);

  // TODO: Check also for permissions. Can the user read and write to the file when it exists?
  if (!existsSync(path)) {
    const title = Path.basename(path, '.srcmd');
    await fs.writeFile(path, newContents(title), { encoding: 'utf8' });
  }

  const buffer = await fs.readFile(path);
  const hash = await sha256(new Uint8Array(buffer));
  const contents = buffer.toString();

  const id = randomid();
  const result = decode(contents);

  if (result.error) {
    const errors = result.errors.map((msg) => '  * ' + msg).join('\n');
    throw new Error(`Cannot create session, errors were found when parsing ${path}:\n${errors}`);
  }

  sessions[id] = {
    id: id,
    hash: hash,
    path: path,
    cells: result.cells,
  };

  return sessions[id];
}

export async function updateSession(
  session: SessionType,
  updates: Partial<SessionType>,
): Promise<SessionType> {
  const id = session.id;
  sessions[id] = { ...session, ...updates };
  return sessions[id];
}

export async function findSession(id: string): Promise<SessionType> {
  return sessions[id];
}

export function sessionToResponse(session: SessionType) {
  return {
    id: session.id,
    path: session.path,
    cells: session.cells,
  };
}

export function createCell({
  type,
}: {
  type: 'markdown' | 'code';
}): CodeCellType | MarkdownCellType {
  switch (type) {
    case 'code':
      return {
        id: randomid(),
        stale: false,
        type: 'code',
        source: '',
        language: 'javascript',
        filename: 'untitled.mjs',
        output: [],
      };
    case 'markdown':
      return {
        id: randomid(),
        type: 'markdown',
        text: '## New Markdown Cell',
      };
    default:
      throw new Error(`Unrecognized cell type ${type}`);
  }
}

export async function exec(_session: SessionType, cell: CodeCellType, _source: string) {
  return cell;
}

export function findCell(session: SessionType, id: string) {
  return session.cells.find((cell) => cell.id === id);
}

export function replaceCell(session: SessionType, cell: CellType) {
  return session.cells.map((c) => (c.id === cell.id ? cell : c));
}

export function removeCell(session: SessionType, id: string) {
  return session.cells.filter((cell) => cell.id !== id);
}
