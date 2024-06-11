import os from 'node:os';
import path from 'node:path';

export const HOME_DIR = os.homedir();
export const SRCBOOK_DIR = path.join(HOME_DIR, '.srcbook');
