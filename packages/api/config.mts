import { eq } from 'drizzle-orm';
import { randomid } from '@srcbook/shared';
import { configs, type Config, secrets, type Secret } from './db/schema.mjs';
import { db } from './db/index.mjs';
import { HOME_DIR } from './constants.mjs';

async function init() {
  const existingConfig = await db.select().from(configs).limit(1);

  if (existingConfig.length === 0) {
    const defaultConfig = {
      baseDir: HOME_DIR,
      defaultLanguage: 'typescript',
      installId: randomid(),
      aiConfig: { provider: 'openai', model: 'gpt-4o' } as const,
      aiProvider: 'openai',
      aiModel: 'gpt-4o',
    };
    console.log();
    console.log('Initializing application with the following configuration:\n');
    console.log(JSON.stringify(defaultConfig, null, 2));
    console.log();
    await db.insert(configs).values(defaultConfig).returning();
  }
}

// Block rest of module until we have initialized config.
await init();

export async function getConfig(): Promise<Config> {
  const results = await db.select().from(configs);

  if (results.length !== 1) {
    console.warn('Expected exactly one config record, found:', results.length);
  }
  if (results.length === 0) {
    throw new Error('No config found');
  }
  // explicitly known that a config exists here
  return results[0] as Config;
}

export async function updateConfig(attrs: Partial<Config>) {
  return db.update(configs).set(attrs).returning();
}

export async function getSecrets(): Promise<Record<string, string>> {
  const results = await db.select().from(secrets);
  return results.reduce((acc: Record<string, string>, { name, value }) => {
    acc[name] = value;
    return acc;
  }, {});
}

export async function addSecret(name: string, value: string): Promise<Secret> {
  const result = await db
    .insert(secrets)
    .values({ name, value })
    .onConflictDoUpdate({ target: secrets.name, set: { value } })
    .returning();
  if (result.length === 0) {
    throw new Error('No secret returned');
  }
  // explicitly known that a config exists here
  return result[0] as Secret;
}

export async function removeSecret(name: string) {
  await db.delete(secrets).where(eq(secrets.name, name)).returning();
}
