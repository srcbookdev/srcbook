/**
 * This file is meant to be executed before the rest of the application boots.
 * Otherwise, the application will fail to boot because it expects the code in
 * here to already have executed.
 */

import fs from 'node:fs/promises';
import { SRCBOOKS_DIR } from './constants.mjs';

// This single mkdir is creating:
//
//     ~/.srcbook
//     ~/.srcbook/srcbooks
//
// Make sure the `recursive` options is true to retain this
// behavior and make sure both get created during initialization
// or the app will not work properly.
await fs.mkdir(SRCBOOKS_DIR, { recursive: true });
