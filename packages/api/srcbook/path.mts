import Path from 'node:path';
import { SRCBOOKS_DIR } from '../constants.mjs';

export function pathToSrcbook(id: string) {
  return Path.join(SRCBOOKS_DIR, id);
}

export function pathToReadme(baseDir: string) {
  return Path.join(baseDir, 'README.md');
}

export function pathToPackageJson(baseDir: string) {
  return Path.join(baseDir, 'package.json');
}

export function pathToTsconfigJson(baseDir: string) {
  return Path.join(baseDir, 'tsconfig.json');
}

export function pathToCodeFile(baseDir: string, filename: string) {
  return Path.join(baseDir, 'src', filename);
}

export function filenameFromPath(filePath: string) {
  return Path.basename(filePath);
}

/**
 * True when `filePath` is one of a srcbook's own code cells, i.e. it looks like
 * `<SRCBOOKS_DIR>/<sessionId>/src/<filename>`.
 *
 * Distinguishes a cell the client can scroll to from a file it has to open in a
 * read-only view, such as a type declaration under node_modules.
 */
export function isSrcbookCellPath(filePath: string) {
  const relative = Path.relative(SRCBOOKS_DIR, Path.resolve(filePath));
  const segments = relative.split(Path.sep);
  return segments.length === 3 && segments[1] === 'src';
}
