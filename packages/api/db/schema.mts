import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const config = sqliteTable('config', {
  // Directory where .srcmd files will be stored and searched by default
  baseDir: text('name'),
});

export type Config = typeof config.$inferSelect;

export const secrets = sqliteTable('cities', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  value: text('value').notNull(),
});

export type Secret = typeof secrets.$inferSelect;
