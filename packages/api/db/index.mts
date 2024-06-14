/**
 * Make sure we've created the .srcbook directory on disk
 * before creating the DB
 */
import path from 'node:path';
import '../initialization.mjs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.mjs';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'url';

// We can't use a relative directory for drizzle since this application
// can get run from anywhere, so process.cwd() is not reliable.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const drizzleFolder = path.join(__dirname, '../drizzle');

const DB_PATH = `${process.env.HOME}/.srcbook/srcbook.db`;

const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });
migrate(db, { migrationsFolder: drizzleFolder });
