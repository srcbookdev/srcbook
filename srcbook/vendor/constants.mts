import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'url';

// When running Srcbook as an npx executable, the cwd is not reliable.
// Commands that should be run from the root of the package, like npm scripts
// should therefore use DIST_DIR as the cwd.
const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

export const HOME_DIR = os.homedir();
export const SRCBOOK_DIR = path.join(HOME_DIR, '.srcbook');
export const SRCBOOKS_DIR = path.join(SRCBOOK_DIR, 'srcbooks');
export const DEFAULT_TSCONFIG_PATH = path.join(SRCBOOK_DIR, 'tsconfig.json');
export const DIST_DIR = _dirname;

export const DEFAULT_TSCONFIG = {
  module: 'nodenext',
  moduleResolution: 'nodenext',
  target: 'es2022',
  resolveJsonModule: true,
  noEmit: true,
  allowImportingTsExtensions: true,
};
