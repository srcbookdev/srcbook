/**
 * Make sure we've created the .srcbook directory on disk
 * before creating the DB
 */
import '../initialization.mjs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.mjs';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const DB_PATH = `${process.env.HOME}/.srcbook/srcbook.db`;

const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });
migrate(db, { migrationsFolder: 'drizzle' });
