import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'url';

// When running Srcbook as an npx executable, the cwd is not reliable.
// Commands that should be run from the root of the package, like npm scripts
// should therefore use DIST_DIR as the cwd.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const HOME_DIR = os.homedir();
export const SRCBOOK_DIR = path.join(HOME_DIR, '.srcbook');
export const SRCBOOKS_DIR = path.join(SRCBOOK_DIR, 'srcbooks');
export const DIST_DIR = __dirname;
