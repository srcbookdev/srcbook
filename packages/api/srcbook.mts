import fs from 'node:fs/promises';
import Path from 'node:path';
import { encode, decode } from './srcmd.mjs';
import { toFormattedJSON } from './utils.mjs';
import { readdir } from './fs-utils.mjs';
import { CellType } from './types';
import { randomid } from '@srcbook/shared';

export async function writeToDisk(srcbookDir: string, cells: CellType[]) {
  const writes = [
    fs.writeFile(Path.join(srcbookDir, 'README.md'), encode(cells, { inline: false }), {
      encoding: 'utf8',
    }),
  ];

  for (const cell of cells) {
    if (cell.type === 'package.json') {
      writes.push(
        fs.writeFile(Path.join(srcbookDir, 'package.json'), cell.source, { encoding: 'utf8' }),
      );
    } else if (cell.type === 'code') {
      writes.push(
        fs.writeFile(Path.join(srcbookDir, cell.filename), cell.source, { encoding: 'utf8' }),
      );
    }
  }

  await Promise.all(writes);
}

/**
 * Creates a srcbook directory from a .srcmd file.
 */
export async function importSrcbookFromSrcmdFile(
  srcmdPath: string,
  destinationDir: string,
  name: string,
) {
  const dirname = Path.join(destinationDir, name);

  const [srcmd] = await Promise.all([
    fs.readFile(srcmdPath, 'utf8'),
    createSrcbookDirectory(dirname),
  ]);

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
 */
export async function createNewSrcbook(path: string, name: string) {
  const dirname = Path.join(path, name);

  await createSrcbookDirectory(dirname);

  const cells: CellType[] = [
    {
      id: randomid(),
      type: 'title',
      text: name,
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

async function createSrcbookDirectory(dirname: string) {
  const dir = await readdir(dirname);

  if (dir.exists && dir.files.length > 0) {
    throw new Error(`Cannot create srcbook in non-empty directory ${dirname}`);
  }

  if (!dir.exists) {
    await fs.mkdir(dirname, { recursive: true });
  }
}

function buildPackageJson() {
  return toFormattedJSON({ dependencies: {} });
}
