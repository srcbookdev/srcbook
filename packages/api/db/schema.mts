import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { randomid } from '@srcbook/shared';
import { z } from 'zod';

// Add MCP server config types
export const McpServerConfig = z.object({
  host: z.string().url(),
  tools: z.array(z.string()).optional(),
});

export type McpServerConfig = z.infer<typeof McpServerConfig>;

export const configs = sqliteTable('config', {
  // Directory where .src.md files will be stored and searched by default.
  baseDir: text('base_dir').notNull(),
  defaultLanguage: text('default_language').notNull().default('typescript'),
  openaiKey: text('openai_api_key'),
  anthropicKey: text('anthropic_api_key'),
  xaiKey: text('xai_api_key'),
  geminiKey: text('gemini_api_key'),
  // TODO: This is deprecated in favor of SRCBOOK_DISABLE_ANALYTICS env variable. Remove this.
  enabledAnalytics: integer('enabled_analytics', { mode: 'boolean' }).notNull().default(true),
  // Stable ID for posthog
  installId: text('srcbook_installation_id').notNull().default(randomid()),
  aiProvider: text('ai_provider').notNull().default('openai'),
  aiModel: text('ai_model').default('gpt-4o'),
  aiBaseUrl: text('ai_base_url'),
  // Null: unset. Email: subscribed. "dismissed": dismissed the dialog.
  subscriptionEmail: text('subscription_email'),
  // Add MCP configuration
  mcpServers: text('mcp_servers', { mode: 'json' }).$type<Record<string, {
    host: string;
    tools?: string[];
  }>>().default({}),
});

export type Config = typeof configs.$inferSelect;

export const secrets = sqliteTable('secrets', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  value: text('value').notNull(),
});

export type Secret = typeof secrets.$inferSelect;

export const secretsToSession = sqliteTable(
  'secrets_to_sessions',
  {
    id: integer('id').primaryKey(),
    session_id: text('session_id').notNull(),
    secret_id: integer('secret_id')
      .notNull()
      .references(() => secrets.id),
  },
  (t) => ({
    unique_session_secret: unique().on(t.session_id, t.secret_id),
  }),
);

export type SecretsToSession = typeof secretsToSession.$inferSelect;

export const apps = sqliteTable('apps', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  externalId: text('external_id').notNull().unique(),
  history: text('history').notNull().default('[]'), // JSON encoded value of the history
  historyVersion: integer('history_version').notNull().default(1), // internal versioning of history type for migrations
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type App = typeof apps.$inferSelect;
