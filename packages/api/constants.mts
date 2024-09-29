import os from 'node:os';
import Path from 'node:path';
import { fileURLToPath } from 'url';

// When running Srcbook as an npx executable, the cwd is not reliable.
// Commands that should be run from the root of the package, like npm scripts
// should therefore use DIST_DIR as the cwd.
const _filename = fileURLToPath(import.meta.url);
const _dirname = Path.dirname(_filename);

export const HOME_DIR = os.homedir();
export const SRCBOOK_DIR = Path.join(HOME_DIR, '.srcbook');
export const SRCBOOKS_DIR = Path.join(SRCBOOK_DIR, 'srcbooks');
export const DIST_DIR = _dirname;
export const PROMPTS_DIR = Path.join(DIST_DIR, 'prompts');
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
