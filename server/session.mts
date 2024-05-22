import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import Path from 'node:path';
import { encode, decode, newContents } from './srcmd.mjs';
import { randomid } from './utils.mjs';
import { SRCBOOK_DIR } from './config.mjs';
import { exec } from './exec.mjs';

import type { CellType, CodeCellType, MarkdownCellType, SessionType } from './types';

const sessions: Record<string, SessionType> = {};

async function flushSession(session: SessionType) {
  function pathFor(file: string) {
    return Path.join(session.dir, file);
  }

  const writes = [
    fs.writeFile(pathFor('README.md'), encode(session.cells, { inline: false }), {
      encoding: 'utf8',
    }),
  ];

  for (const cell of session.cells) {
    if (cell.type === 'package.json') {
      writes.push(fs.writeFile(pathFor('package.json'), cell.source, { encoding: 'utf8' }));
    } else if (cell.type === 'code') {
      writes.push(fs.writeFile(pathFor(cell.filename), cell.source, { encoding: 'utf8' }));
    }
  }

  return Promise.all(writes);
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

  const contents = await fs.readFile(path, { encoding: 'utf8' });

  const id = randomid();
  const result = decode(contents);

  if (result.error) {
    const errors = result.errors.map((msg) => '  * ' + msg).join('\n');
    throw new Error(`Cannot create session, errors were found when parsing ${path}:\n${errors}`);
  }

  const session: SessionType = {
    id: id,
    dir: Path.join(SRCBOOK_DIR, id),
    srcmdPath: path,
    cells: result.cells,
  };

  // Persist session to disk.
  await fs.mkdir(session.dir);
  await flushSession(session);

  sessions[id] = session;

  return session;
}

export async function updateSession(
  session: SessionType,
  updates: Partial<SessionType>,
): Promise<SessionType> {
  const id = session.id;
  const updatedSession = { ...session, ...updates };
  sessions[id] = updatedSession;
  await flushSession(updatedSession);
  return updatedSession;
}

export async function findSession(id: string): Promise<SessionType> {
  return sessions[id];
}

export function sessionToResponse(session: SessionType) {
  return {
    id: session.id,
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

export async function execCell(session: SessionType, cell: CodeCellType) {
  return exec(cell.filename, { cwd: session.dir });
}

export function findCell(session: SessionType, id: string) {
  return session.cells.find((cell) => cell.id === id);
}

export function replaceCell(session: SessionType, cell: CellType) {
  return session.cells.map((c) => (c.id === cell.id ? cell : c));
}

export function insertCellAt(session: SessionType, cell: CellType, index: number) {
  const cells = [...session.cells];
  cells.splice(index, 0, cell);
  return cells;
}

export function removeCell(session: SessionType, id: string) {
  return session.cells.filter((cell) => cell.id !== id);
}
