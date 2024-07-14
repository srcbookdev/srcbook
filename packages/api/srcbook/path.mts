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
