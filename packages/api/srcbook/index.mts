import fs from 'node:fs/promises';
import Path from 'node:path';
import type {
  CellType,
  CodeCellType,
  CodeLanguageType,
  PackageJsonCellType,
} from '@srcbook/shared';
import { randomid } from '@srcbook/shared';
import { encode, decode } from '../srcmd.mjs';
import { toFormattedJSON } from '../utils.mjs';
import { readdir } from '../fs-utils.mjs';
import { SRCBOOKS_DIR } from '../constants.mjs';
import { EXAMPLE_SRCBOOKS } from '../srcbook/examples.mjs';
import { pathToCodeFile, pathToPackageJson, pathToReadme, pathToTsconfigJson } from './path.mjs';
import { buildJSPackageJson, buildTSPackageJson, buildTsconfigJson } from './config.mjs';
import type { SessionType } from '../types.mjs';

function writeCellOnlyToDisk(srcbookDir: string, cell: PackageJsonCellType | CodeCellType) {
  const path =
    cell.type === 'package.json'
      ? pathToPackageJson(srcbookDir)
      : pathToCodeFile(srcbookDir, cell.filename);

  return fs.writeFile(path, cell.source, { encoding: 'utf8' });
}

export function writeToDisk(
  srcbook: Pick<SessionType, 'dir' | 'cells' | 'language' | 'tsconfig.json'>,
) {
  const writes = [writeReadmeToDisk(srcbook.dir, srcbook.language, srcbook.cells)];

  if (srcbook['tsconfig.json']) {
    writes.push(
      fs.writeFile(pathToTsconfigJson(srcbook.dir), srcbook['tsconfig.json'], {
        encoding: 'utf8',
      }),
    );
  }

  for (const cell of srcbook.cells) {
    if (cell.type === 'package.json' || cell.type === 'code') {
      writes.push(writeCellOnlyToDisk(srcbook.dir, cell));
    }
  }

  return Promise.all(writes);
}

export function writeCellToDisk(
  srcbookDir: string,
  language: CodeLanguageType,
  cells: CellType[],
  cell: PackageJsonCellType | CodeCellType,
) {
  // Readme must also be updated
  return Promise.all([
    writeReadmeToDisk(srcbookDir, language, cells),
    writeCellOnlyToDisk(srcbookDir, cell),
  ]);
}

export function moveCodeCellOnDisk(
  srcbookDir: string,
  language: CodeLanguageType,
  cells: CellType[],
  cell: CodeCellType,
  oldFilename: string,
) {
  return Promise.all([
    writeReadmeToDisk(srcbookDir, language, cells),
    fs.unlink(pathToCodeFile(srcbookDir, oldFilename)),
    fs.writeFile(pathToCodeFile(srcbookDir, cell.filename), cell.source, { encoding: 'utf8' }),
  ]);
}

export function writeReadmeToDisk(
  srcbookDir: string,
  language: CodeLanguageType,
  cells: CellType[],
) {
  return fs.writeFile(pathToReadme(srcbookDir), encode({ cells, language }, { inline: false }), {
    encoding: 'utf8',
  });
}

/**
 * Creates a srcbook directory from a .src.md file.
 */
export async function importSrcbookFromSrcmdFile(srcmdPath: string) {
  // Check if the user is opening one of the example Srcbooks that comes bundled with the app.
  const example = EXAMPLE_SRCBOOKS.find((example) => example.path === srcmdPath);

  if (example) {
    const { exists } = await readdir(example.dirname);

    if (exists) {
      return example.dirname;
    } else {
      const srcmd = await fs.readFile(example.path, 'utf8');
      return importSrcbookFromSrcmdText(srcmd, example.id);
    }
  } else {
    const srcmd = await fs.readFile(srcmdPath, 'utf8');
    return importSrcbookFromSrcmdText(srcmd);
  }
}

/**
 * Creates a srcbook directory from srcmd text.
 */
export async function importSrcbookFromSrcmdText(text: string, directoryBasename?: string) {
  const result = decode(text);

  if (result.error) {
    console.error(result.error);
    throw new Error(`Cannot decode invalid srcmd`);
  }

  const srcbook = result.srcbook;

  const dirname = await createSrcbookDir(directoryBasename);

  if (srcbook.language === 'typescript') {
    // It's possible the srcmd text does not contain tsconfig.json contents.
    // If that's the case, we must generate a new tsconfig.json file with our defaults
    // because reading from this directory will fail if tsconfig.json is missing.
    const tsconfig = srcbook['tsconfig.json'] || toFormattedJSON(buildTsconfigJson());

    await writeToDisk({
      dir: dirname,
      cells: srcbook.cells,
      language: srcbook.language,
      'tsconfig.json': tsconfig,
    });
  } else {
    await writeToDisk({ dir: dirname, ...srcbook });
  }

  return dirname;
}

/**
 * Creates a srcbook directory from a url to a srcmd file.
 */
export async function importSrcbookFromSrcmdUrl(srcmdUrl: string, directoryBasename?: string) {
  const srcmdResponse = await fetch(srcmdUrl);
  if (!srcmdResponse.ok) {
    throw new Error(
      `Error requesting ${srcmdUrl}: ${srcmdResponse.status} ${await srcmdResponse.text()}`,
    );
  }

  const text = await srcmdResponse.text();
  return importSrcbookFromSrcmdText(text, directoryBasename);
}

/**
 * Creates a new srcbook.
 * Each Srcbook has a directory in ~/.srcbook/ refered to as its private directory.
 * This private directory has a randomid() private identifier.
 * Users are not supposed to be aware or modify private directories.
 */
export async function createSrcbook(title: string, language: CodeLanguageType) {
  const dirname = await createSrcbookDir();

  const cells: CellType[] = [
    {
      id: randomid(),
      type: 'title',
      text: title,
    },
    {
      id: randomid(),
      type: 'package.json',
      source: buildPackageJson(language),
      filename: 'package.json',
      status: 'idle',
    },
  ];

  if (language === 'typescript') {
    await writeToDisk({
      dir: dirname,
      language,
      cells,
      'tsconfig.json': toFormattedJSON(buildTsconfigJson()),
    });
  } else {
    await writeToDisk({ dir: dirname, language, cells });
  }

  return dirname;
}

async function createSrcbookDir(basename: string = randomid()) {
  const srcbookDirectoryPath = Path.join(SRCBOOKS_DIR, basename);

  // Create the srcbook directory
  await fs.mkdir(srcbookDirectoryPath);

  // Create the src directory for user code
  const srcPath = Path.join(srcbookDirectoryPath, 'src');
  await fs.mkdir(srcPath);

  return srcbookDirectoryPath;
}

function buildPackageJson(language: CodeLanguageType) {
  return toFormattedJSON(language === 'typescript' ? buildTSPackageJson() : buildJSPackageJson());
}

export function removeSrcbook(srcbookDir: string) {
  fs.rm(srcbookDir, { recursive: true });
}

export function removeCodeCellFromDisk(srcbookDir: string, filename: string) {
  return fs.rm(pathToCodeFile(srcbookDir, filename));
}
