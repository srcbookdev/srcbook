import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { config } from './schema.mjs';

const DB_PATH = `${process.env.HOME}/.srcmd/srcbook.db`;

const sqlite = new Database(DB_PATH);
const db = drizzle(sqlite);
const result = await db.select().from(config);
console.log(result);
