import fs from 'node:fs/promises';
import Path from 'node:path';
import {
  randomid,
  CellType,
  CellUpdateAttrsType,
  TitleCellUpdateAttrsSchema,
  MarkdownCellUpdateAttrsSchema,
  CodeCellUpdateAttrsSchema,
  PackageJsonCellUpdateAttrsSchema,
  TitleCellType,
  MarkdownCellType,
  PackageJsonCellType,
  CodeCellType,
  CellErrorType,
} from '@srcbook/shared';
import { encode, decodeDir } from './srcmd.mjs';
import { SRCBOOK_DIR } from './config.mjs';
import { SessionType } from './types';
import { writeToDisk, writeCellToDisk, writeReadmeToDisk, moveCodeCellOnDisk } from './srcbook.mjs';
import { fileExists } from './fs-utils.mjs';
import { validFilename } from './server/shared.mjs';

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

type UpdateResultType =
  | { success: true; cell: CellType }
  | { success: false; errors: CellErrorType[] };

async function updateCellWithRollback<T extends CellType>(
  session: SessionType,
  oldCell: T,
  updates: Partial<T>,
  onUpdate: (session: SessionType, cells: CellType) => Promise<CellErrorType[] | void>,
): Promise<UpdateResultType> {
  const updatedCell = { ...oldCell, ...updates };
  const cells = replaceCell(session, updatedCell);
  session.cells = cells;

  const errors = await onUpdate(session, updatedCell);

  if (errors && errors.length > 0) {
    // rollback
    const cells = replaceCell(session, oldCell);
    session.cells = cells;
    return { success: false, errors };
  } else {
    return { success: true, cell: updatedCell };
  }
}

function updateTitleCell(session: SessionType, cell: TitleCellType, updates: any) {
  const attrs = TitleCellUpdateAttrsSchema.parse(updates);
  return updateCellWithRollback(session, cell, attrs, async (session) => {
    try {
      await writeReadmeToDisk(session.dir, session.cells);
    } catch (e) {
      console.error(e);
      return [{ message: 'An error occurred persisting files to disk' }];
    }
  });
}

function updateMarkdownCell(session: SessionType, cell: MarkdownCellType, updates: any) {
  const attrs = MarkdownCellUpdateAttrsSchema.parse(updates);
  return updateCellWithRollback(session, cell, attrs, async (session) => {
    try {
      await writeReadmeToDisk(session.dir, session.cells);
    } catch (e) {
      console.error(e);
      return [{ message: 'An error occurred persisting files to disk' }];
    }
  });
}

function updatePackageJsonCell(session: SessionType, cell: PackageJsonCellType, updates: any) {
  const attrs = PackageJsonCellUpdateAttrsSchema.parse(updates);
  return updateCellWithRollback(session, cell, attrs, async (session, updatedCell) => {
    try {
      await writeCellToDisk(session.dir, session.cells, updatedCell as PackageJsonCellType);
    } catch (e) {
      console.error(e);
      return [{ message: 'An error occurred persisting files to disk' }];
    }
  });
}

async function updateCodeCell(
  session: SessionType,
  cell: CodeCellType,
  updates: any,
): Promise<UpdateResultType> {
  const attrs = CodeCellUpdateAttrsSchema.parse(updates);

  // Ignore it if it's somehow the same as the existing file
  if (attrs.filename === cell.filename) {
    delete attrs.filename;
  }

  if (attrs.filename && !validFilename(attrs.filename)) {
    return {
      success: false,
      errors: [{ message: `${attrs.filename} is not a valid filename`, attribute: 'filename' }],
    };
  }

  if (attrs.filename && (await fileExists(Path.join(session.dir, attrs.filename)))) {
    return {
      success: false,
      errors: [
        { message: `A file named '${attrs.filename}' already exists`, attribute: 'filename' },
      ],
    };
  }

  const isChangingFilename = !!attrs.filename;

  return updateCellWithRollback(session, cell, attrs, async (session, updatedCell) => {
    try {
      const writes = isChangingFilename
        ? moveCodeCellOnDisk(session.dir, session.cells, updatedCell as CodeCellType, cell.filename)
        : writeCellToDisk(session.dir, session.cells, updatedCell as CodeCellType);
      await writes;
    } catch (e) {
      console.error(e);
      return [{ message: 'An error occurred persisting files to disk' }];
    }
  });
}

export function updateCell(session: SessionType, cell: CellType, updates: CellUpdateAttrsType) {
  switch (cell.type) {
    case 'title':
      return updateTitleCell(session, cell, updates);
    case 'markdown':
      return updateMarkdownCell(session, cell, updates);
    case 'package.json':
      return updatePackageJsonCell(session, cell, updates);
    case 'code':
      return updateCodeCell(session, cell, updates);
  }
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
