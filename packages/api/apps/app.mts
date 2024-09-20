import { CodeLanguageType, randomid, type AppType } from '@srcbook/shared';
import { db } from '../db/index.mjs';
import { type App, apps as appsTable } from '../db/schema.mjs';
import { createViteApp, deleteViteApp } from './disk.mjs';
import { CreateAppSchemaType } from './schemas.mjs';
import { asc, desc, eq } from 'drizzle-orm';

function toSecondsSinceEpoch(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function serializeApp(app: App): AppType {
  return {
    id: app.externalId,
    name: app.name,
    language: app.language as CodeLanguageType,
    createdAt: toSecondsSinceEpoch(app.createdAt),
    updatedAt: toSecondsSinceEpoch(app.updatedAt),
  };
}

async function insert(attrs: Pick<App, 'name' | 'language' | 'externalId'>): Promise<App> {
  const [app] = await db.insert(appsTable).values(attrs).returning();
  return app!;
}

export async function createApp(data: CreateAppSchemaType): Promise<App> {
  const app = await insert({
    name: data.name,
    language: data.language,
    externalId: randomid(),
  });

  return createViteApp(app);
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
