import fs from 'node:fs/promises';
import Path from 'node:path';
import { randomid } from '@srcbook/shared';
import { encode, decodeDir } from './srcmd.mjs';
import { SRCBOOK_DIR } from './config.mjs';
import type { CellType, SessionType } from './types';
import { writeToDisk } from './srcbook.mjs';

const sessions: Record<string, SessionType> = {};

function findSessionByDirname(dirname: string) {
  return Object.values(sessions).find((session) => session.dir === dirname);
}

export async function createSession(srcbookDir: string) {
  const existingSession = findSessionByDirname(srcbookDir);

  if (existingSession) {
    return existingSession;
  }

  const result = await decodeDir(srcbookDir);
  if (result.error) {
    console.error(result.errors);
    throw new Error(`Cannot create session from invalid srcbook directory at ${srcbookDir}`);
  }

  const session = {
    id: randomid(),
    dir: srcbookDir,
    cells: result.cells,
  };

  sessions[session.id] = session;

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
        const session = await createSession(Path.join(entry.parentPath, entry.name));
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
    await writeToDisk(updatedSession.dir, updatedSession.cells);
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
    dirName: Path.basename(session.dir),
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
