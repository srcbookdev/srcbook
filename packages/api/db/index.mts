/**
 * Make sure we've created the .srcbook directory on disk
 * before creating the DB
 */
import path from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.mjs';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { DIST_DIR } from '../constants.mjs';

// We can't use a relative directory for drizzle since this application
// can get run from anywhere, so use DIST_DIR as ground truth.
const drizzleFolder = path.join(DIST_DIR, 'drizzle');

const DB_PATH = `${process.env.HOME}/.srcbook/srcbook.db`;

const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });

export function configureDB(): void {
  migrate(db, { migrationsFolder: drizzleFolder });
}
