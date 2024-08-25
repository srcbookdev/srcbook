import path from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.mjs';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { DIST_DIR, SRCBOOKS_DIR } from '../constants.mjs';
import fs from 'node:fs';

// We can't use a relative directory for drizzle since this application
// can get run from anywhere, so use DIST_DIR as ground truth.
const drizzleFolder = path.join(DIST_DIR, 'drizzle');

const DB_PATH = `${process.env.HOME}/.srcbook/srcbook.db`;

// Creates the HOME/.srcbook/srcbooks dir
fs.mkdirSync(SRCBOOKS_DIR, { recursive: true });

export const db = drizzle(new Database(DB_PATH), { schema });
migrate(db, { migrationsFolder: drizzleFolder });
