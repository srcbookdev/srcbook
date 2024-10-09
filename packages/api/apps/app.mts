import { CodeLanguageType, randomid, type AppType } from '@srcbook/shared';
import { db } from '../db/index.mjs';
import { type App as DBAppType, apps as appsTable } from '../db/schema.mjs';
import { createViteApp, createAppFromProject, deleteViteApp, pathToApp } from './disk.mjs';
import { CreateAppSchemaType, CreateAppWithAiSchemaType } from './schemas.mjs';
import { asc, desc, eq } from 'drizzle-orm';
import { npmInstall } from '../exec.mjs';
import { generateApp } from '../ai/generate.mjs';
import { parseProjectXML } from '../ai/app-parser.mjs';

function toSecondsSinceEpoch(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function serializeApp(app: DBAppType): AppType {
  return {
    id: app.externalId,
    name: app.name,
    language: app.language as CodeLanguageType,
    createdAt: toSecondsSinceEpoch(app.createdAt),
    updatedAt: toSecondsSinceEpoch(app.updatedAt),
  };
}

async function insert(
  attrs: Pick<DBAppType, 'name' | 'language' | 'externalId'>,
): Promise<DBAppType> {
  const [app] = await db.insert(appsTable).values(attrs).returning();
  return app!;
}

export async function createAppWithAi(data: CreateAppWithAiSchemaType): Promise<DBAppType> {
  const app = await insert({
    name: data.name,
    // Hardcode to typescript for now.
    language: 'typescript',
    externalId: randomid(),
  });

  const result = await generateApp(data.prompt);
  console.log('About to parse the project XML');
  const project = parseProjectXML(result);
  console.log('About to create the app from the project');
  await createAppFromProject(app, project);

  // TODO: handle this better.
  // This should be done somewhere else and surface issues or retries.
  // Not awaiting here because it's "happening in the background".
  npmInstall({
    cwd: pathToApp(app.externalId),
    stdout(data) {
      console.log(data.toString('utf8'));
    },
    stderr(data) {
      console.error(data.toString('utf8'));
    },
    onExit(code) {
      console.log(`npm install exit code: ${code}`);
    },
  });

  return app;
}
export async function createApp(data: CreateAppSchemaType): Promise<DBAppType> {
  const app = await insert({
    name: data.name,
    language: data.language,
    externalId: randomid(),
  });

  await createViteApp(app);

  // TODO: handle this better.
  // This should be done somewhere else and surface issues or retries.
  // Not awaiting here because it's "happening in the background".
  npmInstall({
    cwd: pathToApp(app.externalId),
    stdout(data) {
      console.log(data.toString('utf8'));
    },
    stderr(data) {
      console.error(data.toString('utf8'));
    },
    onExit(code) {
      console.log(`npm install exit code: ${code}`);
    },
  });

  return app;
}

export async function deleteApp(id: string) {
  await db.delete(appsTable).where(eq(appsTable.externalId, id));
  await deleteViteApp(id);
}

export function loadApps(sort: 'asc' | 'desc') {
  const sorter = sort === 'asc' ? asc : desc;
  return db.select().from(appsTable).orderBy(sorter(appsTable.updatedAt));
}

export async function loadApp(id: string) {
  const [app] = await db.select().from(appsTable).where(eq(appsTable.externalId, id));
  return app;
}
