import { randomid, type AppType } from '@srcbook/shared';
import { db } from '../db/index.mjs';
import { type App as DBAppType, apps as appsTable } from '../db/schema.mjs';
import { applyPlan, createViteApp, deleteViteApp, getFlatFilesForApp } from './disk.mjs';
import { CreateAppSchemaType, CreateAppWithAiSchemaType } from './schemas.mjs';
import { asc, desc, eq } from 'drizzle-orm';
import { npmInstall } from './processes.mjs';
import { generateApp } from '../ai/generate.mjs';
import { toValidPackageName } from '../apps/utils.mjs';
import { getPackagesToInstall, parsePlan } from '../ai/plan-parser.mjs';
import { commitAllFiles, initRepo } from './git.mjs';

function toSecondsSinceEpoch(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function serializeApp(app: DBAppType): AppType {
  return {
    id: app.externalId,
    name: app.name,
    createdAt: toSecondsSinceEpoch(app.createdAt),
    updatedAt: toSecondsSinceEpoch(app.updatedAt),
  };
}

async function insert(attrs: Pick<DBAppType, 'name' | 'externalId'>): Promise<DBAppType> {
  const [app] = await db.insert(appsTable).values(attrs).returning();
  return app!;
}

export async function createAppWithAi(data: CreateAppWithAiSchemaType): Promise<DBAppType> {
  const app = await insert({
    name: data.name,
    externalId: randomid(),
  });

  await createViteApp(app);

  await initRepo(app);

  // Note: we don't surface issues or retries and this is "running in the background".
  // In this case it works in our favor because we'll kickoff generation while it happens
  const firstNpmInstallProcess = npmInstall(app.externalId, {
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

  const files = await getFlatFilesForApp(app.externalId);
  const result = await generateApp(toValidPackageName(app.name), files, data.prompt);
  const plan = await parsePlan(result, app, data.prompt, randomid());
  await applyPlan(app, plan);

  const packagesToInstall = getPackagesToInstall(plan);

  if (packagesToInstall.length > 0) {
    await firstNpmInstallProcess;

    console.log('installing packages', packagesToInstall);
    npmInstall(app.externalId, {
      packages: packagesToInstall,
      stdout(data) {
        console.log(data.toString('utf8'));
      },
      stderr(data) {
        console.error(data.toString('utf8'));
      },
      onExit(code) {
        console.log(`npm install exit code: ${code}`);
        console.log('Applying git commit');
        commitAllFiles(app, `Add dependencies: ${packagesToInstall.join(', ')}`);
      },
    });
  }

  return app;
}
export async function createApp(data: CreateAppSchemaType): Promise<DBAppType> {
  const app = await insert({
    name: data.name,
    externalId: randomid(),
  });

  await createViteApp(app);

  // TODO: handle this better.
  // This should be done somewhere else and surface issues or retries.
  // Not awaiting here because it's "happening in the background".
  npmInstall(app.externalId, {
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

export async function updateApp(id: string, attrs: { name: string }) {
  const [updatedApp] = await db
    .update(appsTable)
    .set({ name: attrs.name })
    .where(eq(appsTable.externalId, id))
    .returning();
  return updatedApp;
}
