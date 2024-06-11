/**
 * This file is meant to be executed before the rest of the application boots.
 * Otherwise, the application will fail to boot because it expects the code in
 * here to already have executed.
 */

import fs from 'node:fs/promises';
import { SRCBOOK_DIR } from './constants.mjs';

// make sure to await this
await fs.mkdir(SRCBOOK_DIR, { recursive: true });
