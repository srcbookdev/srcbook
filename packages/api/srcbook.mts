import fs from 'node:fs/promises';
import Path from 'node:path';
import { CellType, CodeCellType, PackageJsonCellType } from '@srcbook/shared';
import { encode, decode } from './srcmd.mjs';
import { toFormattedJSON } from './utils.mjs';
import { randomid } from '@srcbook/shared';
import { SRCBOOK_DIR } from './constants.mjs';

export function writeToDisk(srcbookDir: string, cells: CellType[]) {
  const writes = [writeReadmeToDisk(srcbookDir, cells)];

  for (const cell of cells) {
    if (cell.type === 'package.json' || cell.type === 'code') {
      writes.push(
        fs.writeFile(Path.join(srcbookDir, cell.filename), cell.source, { encoding: 'utf8' }),
      );
    }
  }

  return Promise.all(writes);
}

export function writeCellToDisk(
  srcbookDir: string,
  cells: CellType[],
  cell: PackageJsonCellType | CodeCellType,
) {
  return Promise.all([
    writeReadmeToDisk(srcbookDir, cells),
    fs.writeFile(Path.join(srcbookDir, cell.filename), cell.source, { encoding: 'utf8' }),
  ]);
}

export function moveCodeCellOnDisk(
  srcbookDir: string,
  cells: CellType[],
  cell: CodeCellType,
  oldFilename: string,
) {
  return Promise.all([
    writeReadmeToDisk(srcbookDir, cells),
    fs.unlink(Path.join(srcbookDir, oldFilename)),
    fs.writeFile(Path.join(srcbookDir, cell.filename), cell.source, { encoding: 'utf8' }),
  ]);
}

export function writeReadmeToDisk(srcbookDir: string, cells: CellType[]) {
  return fs.writeFile(Path.join(srcbookDir, 'README.md'), encode(cells, { inline: false }), {
    encoding: 'utf8',
  });
}

/**
 * Creates a srcbook directory from a .srcmd file.
 * TODO: First check for a srcbook directory with this filename linked, as described in
 * https://linear.app/axflow/issue/AXF-146/files-and-directories-behavior
 */
export async function importSrcbookFromSrcmdFile(srcmdPath: string) {
  const [srcmd, dirname] = await Promise.all([fs.readFile(srcmdPath, 'utf8'), newSrcbookDir()]);

  const result = decode(srcmd);

  if (result.error) {
    console.error(result.error);
    throw new Error(`Cannot decode invalid srcmd in ${srcmdPath}`);
  }

  await writeToDisk(dirname, result.cells);

  return dirname;
}

/**
 * Creates a new srcbook.
 * Each Srcbook has a directory in ~/.srcbook/ refered to as its private directory.
 * This private directory has a randomid() private identifier.
 * Users are not supposed to be aware or modify private directories.
 */
export async function createNewSrcbook(title: string) {
  const dirname = await newSrcbookDir();

  const cells: CellType[] = [
    {
      id: randomid(),
      type: 'title',
      text: title,
    },
    {
      id: randomid(),
      type: 'package.json',
      source: buildPackageJson(),
      filename: 'package.json',
      status: 'idle',
    },
  ];

  await writeToDisk(dirname, cells);

  return dirname;
}

async function newSrcbookDir() {
  const dirname = Path.join(SRCBOOK_DIR, randomid());
  await fs.mkdir(dirname, { recursive: true });
  return dirname;
}

function buildPackageJson() {
  return toFormattedJSON({ dependencies: {} });
}
