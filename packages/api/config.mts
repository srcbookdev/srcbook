import os from 'node:os';
import { eq } from 'drizzle-orm';
import path from 'node:path';
import { configs, type Config, secrets, type Secret } from './db/schema.mjs';
import { db } from './db/index.mjs';

export const HOME_DIR = os.homedir();
export const SRCBOOK_DIR = path.join(HOME_DIR, '.srcbook');

export async function getConfig(): Promise<Config> {
  const results = await db.select().from(configs).limit(1);
  if (results.length === 0) {
    await initializeConfig();
    return getConfig();
  }

  if (results.length !== 1) {
    console.warn('Expected excatly one config record, found:', results.length);
  }
  return results[0];
}

export async function updateConfig(attrs: Partial<Config>) {
  console.log('Updating config with attrs:', attrs);
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
  return result[0];
}

export async function removeSecret(name: string) {
  await db.delete(secrets).where(eq(secrets.name, name)).returning();
}

export async function initializeConfig() {
  const existingConfig = await db.select().from(configs).limit(1);
  if (existingConfig.length === 0) {
    console.log(`Inializing usere config with baseDir: ${HOME_DIR}`);
    return db.insert(configs).values({ baseDir: HOME_DIR }).returning();
  }
}
