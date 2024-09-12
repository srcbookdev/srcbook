import fs from 'node:fs/promises';
import Path from 'node:path';
import type {
  CellType,
  CellUpdateAttrsType,
  TitleCellType,
  MarkdownCellType,
  PackageJsonCellType,
  CodeCellType,
  CellErrorType,
} from '@srcbook/shared';
import {
  TitleCellUpdateAttrsSchema,
  MarkdownCellUpdateAttrsSchema,
  CodeCellUpdateAttrsSchema,
  PackageJsonCellUpdateAttrsSchema,
  languageFromFilename,
  extensionsForLanguage,
} from '@srcbook/shared';
import { encode, decodeDir } from './srcmd.mjs';
import { SRCBOOKS_DIR } from './constants.mjs';
import type { SessionType } from './types.mjs';
import {
  writeToDisk,
  writeCellToDisk,
  writeReadmeToDisk,
  moveCodeCellOnDisk,
} from './srcbook/index.mjs';
import { fileExists } from './fs-utils.mjs';
import { validFilename } from '@srcbook/shared';
import { pathToCodeFile } from './srcbook/path.mjs';
import { exec } from 'node:child_process';
import { npmInstall } from './exec.mjs';

const sessions: Record<string, SessionType> = {};

function findSessionByDirname(dirname: string) {
  return Object.values(sessions).find((session) => session.dir === dirname);
}

export async function createSession(srcbookDir: string) {
  const existingSession = findSessionByDirname(srcbookDir);

  if (existingSession) {
    const updatedSession = { ...existingSession, openedAt: Date.now() };
    sessions[existingSession.id] = updatedSession;
    return updatedSession;
  }

  const result = await decodeDir(srcbookDir);
  if (result.error) {
    console.error(result.errors);
    throw new Error(`Cannot create session from invalid srcbook directory at ${srcbookDir}`);
  }

  const srcbook = result.srcbook;

  const session: SessionType = {
    id: Path.basename(srcbookDir),
    dir: srcbookDir,
    cells: srcbook.cells,
    language: srcbook.language,
    openedAt: Date.now(),
  };

  if (session.language === 'typescript') {
    session['tsconfig.json'] = srcbook['tsconfig.json'];
  }

  sessions[session.id] = session;

  return session;
}

export async function deleteSessionByDirname(dirName: string) {
  const session = findSessionByDirname(dirName);
  if (session) {
    delete sessions[session.id];
  }
}

// We make sure to load sessions from the disk in addition to the ones already in memory.
export async function listSessions(): Promise<Record<string, SessionType>> {
  return sessions;
}

export async function addCell(
  session: SessionType,
  cell: MarkdownCellType | CodeCellType,
  index: number,
) {
  const cells = insertCellAt(session, cell, index);

  session.cells = cells;

  switch (cell.type) {
    case 'markdown':
      return writeReadmeToDisk(session.dir, session.language, session.cells);
    case 'code':
      return writeCellToDisk(session.dir, session.language, session.cells, cell);
  }
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
    await writeToDisk(updatedSession);
  }
  return updatedSession;
}

export async function exportSrcmdFile(session: SessionType, destinationPath: string) {
  if (await fileExists(destinationPath)) {
    throw new Error(`Cannot export .src.md file: ${destinationPath} already exists`);
  }

  return fs.writeFile(
    destinationPath,
    encode(
      {
        cells: session.cells,
        language: session.language,
        'tsconfig.json': session['tsconfig.json'],
      },
      { inline: true },
    ),
  );
}

export async function findSession(id: string): Promise<SessionType> {
  if (!sessions[id]) {
    throw new Error(`Session with id ${id} not found`);
  }
  // explicitly known that a session exists here
  return sessions[id] as SessionType;
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
      await writeReadmeToDisk(session.dir, session.language, session.cells);
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
      await writeReadmeToDisk(session.dir, session.language, session.cells);
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
      await writeCellToDisk(
        session.dir,
        session.language,
        session.cells,
        updatedCell as PackageJsonCellType,
      );
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
  return updateCellWithRollback(session, cell, { ...attrs }, async (session, updatedCell) => {
    try {
      await writeCellToDisk(
        session.dir,
        session.language,
        session.cells,
        updatedCell as CodeCellType,
      );
    } catch (e) {
      console.error(e);
      return [{ message: 'An error occurred persisting files to disk' }];
    }
  });
}

/**
 * Use this to rename a code cell's filename.
 */
export async function updateCodeCellFilename(
  session: SessionType,
  cell: CodeCellType,
  filename: string,
): Promise<UpdateResultType> {
  if (filename === cell.filename) {
    console.warn(
      `Attempted to update a cell's filename to its existing filename '${cell.filename}'. This is likely a bug in the code.`,
    );
    return { success: true, cell };
  }

  if (!validFilename(filename)) {
    return {
      success: false,
      errors: [{ message: `${filename} is not a valid filename`, attribute: 'filename' }],
    };
  }

  if (session.language !== languageFromFilename(filename)) {
    return {
      success: false,
      errors: [
        {
          message: `File must have one of the following extensions: ${extensionsForLanguage(session.language)}`,
          attribute: 'filename',
        },
      ],
    };
  }

  if (await fileExists(pathToCodeFile(session.dir, filename))) {
    return {
      success: false,
      errors: [{ message: `A file named '${filename}' already exists`, attribute: 'filename' }],
    };
  }

  return updateCellWithRollback(session, cell, { filename }, async (session, updatedCell) => {
    try {
      await moveCodeCellOnDisk(
        session.dir,
        session.language,
        session.cells,
        updatedCell as CodeCellType,
        cell.filename,
      );
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
async function ensurePrettierInstalled(dir: string): Promise<boolean> {
  const prettierPath = Path.join(dir, 'node_modules', 'prettier');
  try {
    // check if prettier is installed
    await fs.access(prettierPath);
    return true;
  } catch (error) {
    return new Promise<boolean>((resolve) => {
      try {
        npmInstall({
          cwd: dir,
          packages: ['prettier'],
          args: ['--save-dev'],
          stdout: () => {},
          stderr: (err) => console.error(err),
          onExit: (exitCode) => {
            if (exitCode === 0) {
              resolve(true);
            } else {
              console.error('Failed to install Prettier:', exitCode);
              resolve(false);
            }
          },
        });
      } catch (installError) {
        console.error('Failed to initiate Prettier installation:', installError);
        resolve(false);
      }
    });
  }
}
export async function formatCode(dir: string, fileName: string) {
  try {
    await ensurePrettierInstalled(dir);

    const codeFilePath = pathToCodeFile(dir, fileName);
    const command = `npx prettier ${codeFilePath}`;

    return new Promise((resolve, reject) => {
      exec(command, async (_, stdout, stderr) => {
        if (stderr) {
          console.error(`exec error: ${stderr}`);
          reject(stderr);
          return;
        }
        resolve(stdout);
      });
    });
  } catch (error) {
    console.error('Formatting error:', error);
    throw error;
  }
}
export async function formatAndUpdateCodeCell(session: SessionType, cell: CodeCellType) {
  try {
    const formattedCode = await formatCode(session.dir, cell.filename);
    return updateCodeCell(session, cell, { source: formattedCode } as { source: string });
  } catch (error) {
    return Promise.resolve({
      success: false,
      errors: error,
    } as UpdateResultType);
  }
}
export function sessionToResponse(session: SessionType) {
  const result: Pick<SessionType, 'id' | 'cells' | 'language' | 'tsconfig.json' | 'openedAt'> = {
    id: session.id,
    cells: session.cells,
    language: session.language,
    openedAt: session.openedAt,
  };

  if (session.language === 'typescript') {
    result['tsconfig.json'] = session['tsconfig.json'];
  }

  return result;
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

async function load() {
  const srcbookDirs = await fs.readdir(SRCBOOKS_DIR, { withFileTypes: true });
  const loadedSessions = srcbookDirs
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => {
      // .path -> .parentPath from node21 onwards.
      const parentPath = entry.parentPath || entry.path;
      try {
        const session = await createSession(Path.join(parentPath, entry.name));
        sessions[session.id] = session;
        return session;
      } catch (e) {
        console.error(
          `Error loading session from ${entry.name}: ${(e as Error).message}. Skipping...`,
        );
      }
    });

  await Promise.all(loadedSessions);
}

// Initialize sessions on boot
await load();
