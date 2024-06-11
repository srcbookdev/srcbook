import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const configs = sqliteTable('config', {
  // Directory where .srcmd files will be stored and searched by default
  baseDir: text('baseDir').notNull(),
});

export type Config = typeof configs.$inferSelect;

export const secrets = sqliteTable('secrets', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  value: text('value').notNull(),
});

export type Secret = typeof secrets.$inferSelect;
