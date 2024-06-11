import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.mjs';

const DB_PATH = `${process.env.HOME}/.srcbook/srcbook.db`;

const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });
