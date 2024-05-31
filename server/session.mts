import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import Path from 'node:path';
import { encode, decode, decodeDir, newContents } from './srcmd.mjs';
import { randomid, toValidNpmName } from './utils.mjs';
import { SRCBOOK_DIR } from './config.mjs';

import type { CellType, SessionType } from './types';

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

async function fromDir(dirname: string): Promise<SessionType> {
  const existingSession = Object.values(sessions).find((session) => session.dir === dirname);
  if (existingSession) {
    return existingSession;
  }
  const result = await decodeDir(dirname);
  if (result.error) {
    throw new Error(
      `Cannot load session from ${dirname}. It's not a valid Sourcebook directory:\n${result.errors}`,
    );
  }
  const session = { id: randomid(), dir: dirname, cells: result.cells };
  sessions[session.id] = session;
  return session;
}

export async function createSession({ dirname, title }: { dirname: string; title: string }) {
  if (typeof dirname !== 'string') {
    throw new Error('Invalid dirname');
  }

  if (typeof title !== 'string') {
    // We assume we're creating a session by reading an existing directory.
    return fromDir(dirname);
  }

  let basename = toValidNpmName(title);
  if (Path.extname(basename) === '') {
    basename += '.srcmd';
  }

  if (Path.extname(basename) !== '.srcmd') {
    throw new Error(`Sessions cannot be created from file types other than .srcmd`);
  }

  const path = Path.join(dirname, basename);

  const contents = existsSync(path)
    ? await fs.readFile(path, { encoding: 'utf8' })
    : newContents(title);

  const id = randomid();
  const result = decode(contents);

  if (result.error) {
    const errors = result.errors.map((msg) => '  * ' + msg).join('\n');
    throw new Error(`Cannot create session, errors were found when parsing ${path}:\n${errors}`);
  }

  const session: SessionType = {
    id: id,
    dir: Path.join(SRCBOOK_DIR, id),
    cells: result.cells,
  };

  // Persist session to disk.
  await fs.mkdir(session.dir);
  await flushSession(session);

  sessions[id] = session;

  return session;
}
export async function deleteSession(session: SessionType) {
  await fs.rm(session.dir, { recursive: true });
  delete sessions[session.id];
}

// We make sure to load sessions from the disk in addition to the ones already in memory.
export async function listSessions(): Promise<Record<string, SessionType>> {
  const srcbookDirs = await fs.readdir(SRCBOOK_DIR, { withFileTypes: true });
  const loadedSessions = srcbookDirs
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => {
      try {
        const session = await fromDir(Path.join(entry.parentPath, entry.name));
        sessions[session.id] = session;
        return session;
      } catch (e) {
        console.error(
          `Error loading session from ${entry.name}: ${(e as Error).message}. Skipping...`,
        );
      }
    });

  await Promise.all(loadedSessions);
  return sessions;
}

export async function updateSession(
  session: SessionType,
  updates: Partial<SessionType>,
  flush: boolean = true,
): Promise<SessionType> {
  const id = session.id;
  const updatedSession = { ...session, ...updates };
  sessions[id] = updatedSession;
  if (flush) {
    await flushSession(updatedSession);
  }
  return updatedSession;
}

export async function exportSession(session: SessionType, writePath: string) {
  return fs.writeFile(writePath, encode(session.cells, { inline: true }));
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

export async function readPackageJsonContentsFromDisk(session: SessionType) {
  return fs.readFile(Path.join(session.dir, 'package.json'), { encoding: 'utf8' });
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
