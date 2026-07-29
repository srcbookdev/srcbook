import z from 'zod';
import { AiProvider } from '@srcbook/shared';

/**
 * Fields a client is allowed to write via POST /api/settings.
 *
 * Deliberately an allowlist rather than a partial of the drizzle row type. The
 * body used to be handed straight to `db.update(configs).set(...)`, which made
 * every column writable — including `installId`, and `aiBaseUrl`, which decides
 * where AI requests (and the user's API key) get sent.
 */
export const ConfigUpdateSchema = z
  .object({
    baseDir: z.string().min(1),
    defaultLanguage: z.enum(['javascript', 'typescript']),
    openaiKey: z.string().nullable(),
    anthropicKey: z.string().nullable(),
    xaiKey: z.string().nullable(),
    geminiKey: z.string().nullable(),
    openrouterKey: z.string().nullable(),
    customApiKey: z.string().nullable(),
    aiProvider: z.enum(Object.values(AiProvider) as [string, ...string[]]),
    aiModel: z.string().nullable(),
    aiBaseUrl: z.string().url().nullable(),
    subscriptionEmail: z.string().nullable(),
    enabledAnalytics: z.boolean(),
  })
  .partial()
  .strict();

export type ConfigUpdateType = z.infer<typeof ConfigUpdateSchema>;
