import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { randomid } from '@srcbook/shared';

// Opening us up for different types of configuration:
// supporting different models, local models and openAI url compatible providers
type AiConfig =
  | { provider: 'openai'; model: 'gpt-4o' }
  | { provider: 'anthropic'; model: 'claude-3-5-sonnet-20240620' };

export const configs = sqliteTable('config', {
  // Directory where .src.md files will be stored and searched by default.
  baseDir: text('base_dir').notNull(),
  defaultLanguage: text('default_language').notNull().default('typescript'),
  openaiKey: text('openai_api_key'),
  anthropicKey: text('anthropic_api_key'),
  // Default on for behavioral analytics.
  // Allows us to improve Srcbook, we don't collect any PII.
  enabledAnalytics: integer('enabled_analytics', { mode: 'boolean' }).notNull().default(true),
  // Stable ID for posthog
  installId: text('srcbook_installation_id').notNull().default(randomid()),
  aiConfig: text('ai_config', { mode: 'json' })
    .$type<AiConfig>()
    .notNull()
    .default({ provider: 'openai', model: 'gpt-4o' }),
});

export type Config = typeof configs.$inferSelect;

export const secrets = sqliteTable('secrets', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  value: text('value').notNull(),
});

export type Secret = typeof secrets.$inferSelect;
