import fs from 'node:fs/promises';
import Path from 'node:path';
import type {
  CellType,
  CodeCellType,
  CodeLanguageType,
  PackageJsonCellType,
  SrcbookMetadataType,
} from '@srcbook/shared';
import { encode, decode } from './srcmd.mjs';
import { toFormattedJSON } from './utils.mjs';
import { randomid } from '@srcbook/shared';
import { SRCBOOKS_DIR, DIST_DIR } from './constants.mjs';

export function writeToDisk(srcbookDir: string, metadata: SrcbookMetadataType, cells: CellType[]) {
  const writes = [writeReadmeToDisk(srcbookDir, metadata, cells)];

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
  metadata: SrcbookMetadataType,
  cells: CellType[],
  cell: PackageJsonCellType | CodeCellType,
) {
  return Promise.all([
    writeReadmeToDisk(srcbookDir, metadata, cells),
    fs.writeFile(Path.join(srcbookDir, cell.filename), cell.source, { encoding: 'utf8' }),
  ]);
}

export function moveCodeCellOnDisk(
  srcbookDir: string,
  metadata: SrcbookMetadataType,
  cells: CellType[],
  cell: CodeCellType,
  oldFilename: string,
) {
  return Promise.all([
    writeReadmeToDisk(srcbookDir, metadata, cells),
    fs.unlink(Path.join(srcbookDir, oldFilename)),
    fs.writeFile(Path.join(srcbookDir, cell.filename), cell.source, { encoding: 'utf8' }),
  ]);
}

export function writeReadmeToDisk(
  srcbookDir: string,
  metadata: SrcbookMetadataType,
  cells: CellType[],
) {
  return fs.writeFile(
    Path.join(srcbookDir, 'README.md'),
    encode(cells, metadata, { inline: false }),
    {
      encoding: 'utf8',
    },
  );
}

/**
 * Creates a srcbook directory from a .srcmd file.
 * TODO: First check for a srcbook directory with this filename linked, as described in
 * https://linear.app/axflow/issue/AXF-146/files-and-directories-behavior
 */
export async function importSrcbookFromSrcmdFile(srcmdPath: string) {
  // When we import tutorials, we don't have absolute paths but rather want to
  // import them from the vendored srcbook application.
  const finalPath = srcmdPath.startsWith('tutorials') ? Path.join(DIST_DIR, srcmdPath) : srcmdPath;
  const [srcmd, dirname] = await Promise.all([fs.readFile(finalPath, 'utf8'), newSrcbookDir()]);

  const result = decode(srcmd);

  if (result.error) {
    console.error(result.error);
    throw new Error(`Cannot decode invalid srcmd in ${srcmdPath}`);
  }

  await writeToDisk(dirname, result.metadata, result.cells);

  return dirname;
}

/**
 * Creates a new srcbook.
 * Each Srcbook has a directory in ~/.srcbook/ refered to as its private directory.
 * This private directory has a randomid() private identifier.
 * Users are not supposed to be aware or modify private directories.
 */
export async function createSrcbook(title: string, metadata: SrcbookMetadataType) {
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
      source: buildPackageJson(metadata.language),
      filename: 'package.json',
      status: 'idle',
    },
  ];

  await writeToDisk(dirname, metadata, cells);

  return dirname;
}

async function newSrcbookDir() {
  const dirname = Path.join(SRCBOOKS_DIR, randomid());
  await fs.mkdir(dirname, { recursive: true });
  return dirname;
}

function buildPackageJson(language: CodeLanguageType) {
  return toFormattedJSON(language === 'typescript' ? buildTSPackageJson() : buildJSPackageJson());
}

function buildJSPackageJson() {
  return {
    type: 'module',
    dependencies: {},
  };
}

function buildTSPackageJson() {
  return {
    type: 'module',
    dependencies: {
      tsx: 'latest',
      typescript: 'latest',
    },
  };
}

export function fullSrcbookDir(dirId: string) {
  return Path.join(SRCBOOKS_DIR, dirId);
}

export async function removeSrcbook(srcbookDir: string) {
  await fs.rm(srcbookDir, { recursive: true });
}
