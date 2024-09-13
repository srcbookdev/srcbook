import { eq, and, inArray } from 'drizzle-orm';
import { type SecretWithAssociatedSessions, randomid } from '@srcbook/shared';
import { configs, type Config, secrets, type Secret, secretsToSession } from './db/schema.mjs';
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

export async function getSecrets(): Promise<Array<SecretWithAssociatedSessions>> {
  const secretsResult = await db.select().from(secrets);
  const secretsToSessionResult = await db.select()
    .from(secretsToSession)
    .where(
      inArray(
        secretsToSession.secret_id,
        secretsResult.map(secret => secret.id),
      ),
    );

  return secretsResult.map(secret => ({
    name: secret.name,
    value: secret.value,
    associatedWithSessionIds: (
      secretsToSessionResult
        .filter(secretToSession => secretToSession.secret_id === secret.id)
        .map(secretToSession => secretToSession.session_id)
    ),
  }));
}

export async function getSecretsAssociatedWithSession(sessionId: string): Promise<Record<string, string>> {
  const secretsResults = await getSecrets();
  return Object.fromEntries(
    secretsResults
      .filter(secret => secret.associatedWithSessionIds.includes(sessionId))
      .map(secret => [secret.name, secret.value])
  );
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

export async function associateSecretWithSession(secretName: string, sessionId: string) {
  const result = await db.select({ id: secrets.id }).from(secrets).where(
    eq(secrets.name, secretName),
  ).limit(1);
  if (result.length < 1) {
    throw new Error(`Cannot associate '${secretName}' with ${sessionId}: cannot find secret with that name!`);
  }
  const secretId = result[0]!.id;

  await db
    .insert(secretsToSession)
    .values({ secret_id: secretId, session_id: sessionId })
    .onConflictDoNothing()
    .returning();
}

export async function disassociateSecretWithSession(secretName: string, sessionId: string) {
  const result = await db.select({ id: secrets.id }).from(secrets).where(
    eq(secrets.name, secretName),
  ).limit(1);
  if (result.length < 1) {
    throw new Error(`Cannot associate '${secretName}' with ${sessionId}: cannot find secret with that name!`);
  }
  const secretId = result[0]!.id;

  await db.delete(secretsToSession).where(and(
    eq(secretsToSession.secret_id, secretId),
    eq(secretsToSession.session_id, sessionId),
  )).returning();
}
