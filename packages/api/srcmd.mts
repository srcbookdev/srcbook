import fs from 'node:fs/promises';
import { pathToCodeFile, pathToPackageJson, pathToReadme } from './srcbook/path.mjs';

import { encode } from './srcmd/encoding.mjs';
import { decode } from './srcmd/decoding.mjs';
import { type DecodeResult } from './srcmd/types.mjs';

export { encode, decode };

/**
 * Decode a compatible directory into a set of cells.
 *
 * The directory must contain a README.md file and a package.json file.
 * We assume the README.md file contains the srcbook content, in particular
 * the first 2 cells should be a title cell and then a package.json.cell
 *
 * We leverage the decode() function first to decode the README.md file, and then
 * we replace the contents of the referenced package.json and code files into the cells.
 */
export async function decodeDir(dir: string): Promise<DecodeResult> {
  try {
    const readmePath = pathToReadme(dir);
    const readmeContents = await fs.readFile(readmePath, 'utf-8');
    // Decode the README.md file into cells.
    // The code blocks and the package.json will only contain the filename at this point,
    // the actual source for each file will be read from the file system in the next step.
    const readmeResult = decode(readmeContents);

    if (readmeResult.error) {
      return readmeResult;
    }

    const cells = readmeResult.cells;
    const pendingFileReads: Promise<void>[] = [];

    // Let's replace all the code cells with the actual file contents for each one
    for (const cell of cells) {
      if (cell.type === 'code' || cell.type === 'package.json') {
        const filePath =
          cell.type === 'package.json'
            ? pathToPackageJson(dir)
            : pathToCodeFile(dir, cell.filename);

        pendingFileReads.push(
          fs.readFile(filePath, 'utf-8').then((source) => {
            cell.source = source;
          }),
        );
      }
    }

    // Wait for all file reads to complete
    await Promise.all(pendingFileReads);

    return { error: false, metadata: readmeResult.metadata, cells };
  } catch (e) {
    const error = e as unknown as Error;
    return { error: true, errors: [error.message] };
  }
}
