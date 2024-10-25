import simpleGit, { SimpleGit, DefaultLogFields, ListLogLine } from 'simple-git';
import fs from 'node:fs/promises';
import { broadcastFileUpdated, pathToApp, toFileType } from './disk.mjs';
import type { App as DBAppType } from '../db/schema.mjs';
import Path from 'node:path';

// Helper to get git instance for an app
function getGit(app: DBAppType): SimpleGit {
  const dir = pathToApp(app.externalId);
  return simpleGit(dir);
}

// Initialize a git repository in the app directory
export async function initRepo(app: DBAppType): Promise<void> {
  const git = getGit(app);
  await git.init();
  await commitAllFiles(app, 'Initial commit');
}

// Commit all current files in the app directory
export async function commitAllFiles(app: DBAppType, message: string): Promise<string> {
  const git = getGit(app);

  // Stage all files
  await git.add('.');

  // Create commit
  await git.commit(message, {
    '--author': 'Srcbook <ai@srcbook.com>',
  });

  // Get the exact SHA of the new commit. Sometimes it's 'HEAD <sha>' for some reason
  const sha = await git.revparse(['HEAD']);
  return sha;
}

// Checkout to a specific commit, and notify the client that the files have changed
export async function checkoutCommit(app: DBAppType, commitSha: string): Promise<void> {
  const git = getGit(app);
  // get the files that are different between the current state and the commit
  const files = await getChangedFiles(app, commitSha);

  // we might have a dirty working directory, so we need to stash any changes
  // TODO: we should probably handle this better
  await git.stash();

  // checkout the commit
  await git.checkout(commitSha);

  // notify the client to update the files
  for (const file of files.added) {
    const source = await fs.readFile(Path.join(pathToApp(app.externalId), file), 'utf-8');
    broadcastFileUpdated(app, toFileType(file, source));
  }
  for (const file of files.modified) {
    const source = await fs.readFile(Path.join(pathToApp(app.externalId), file), 'utf-8');
    broadcastFileUpdated(app, toFileType(file, source));
  }
}

// Get commit history
export async function getCommitHistory(
  app: DBAppType,
  limit: number = 100,
): Promise<ReadonlyArray<DefaultLogFields & ListLogLine>> {
  const git = getGit(app);
  const log = await git.log({ maxCount: limit });
  return log.all;
}

// Helper function to ensure the repo exists
export async function ensureRepoExists(app: DBAppType): Promise<void> {
  const git = getGit(app);
  const isRepo = await git.checkIsRepo();

  if (!isRepo) {
    await initRepo(app);
  }
}

// Get the current commit SHA
export async function getCurrentCommitSha(app: DBAppType): Promise<string> {
  const git = getGit(app);
  const revparse = await git.revparse(['HEAD']);
  return revparse;
}

// Get list of changed files between current state and a commit
export async function getChangedFiles(
  app: DBAppType,
  commitSha: string,
): Promise<{ added: string[]; modified: string[]; deleted: string[] }> {
  const git = getGit(app);

  // Get the diff between current state and the specified commit
  const diffSummary = await git.diff(['--name-status', commitSha]);

  const changes = {
    added: [] as string[],
    modified: [] as string[],
    deleted: [] as string[],
  };

  // Parse the diff output
  diffSummary.split('\n').forEach((line) => {
    const [status, ...fileParts] = line.split('\t');
    const file = fileParts.join('\t'); // Handle filenames with tabs

    if (!file || !status) return;

    switch (status[0]) {
      case 'A':
        changes.added.push(file);
        break;
      case 'M':
        changes.modified.push(file);
        break;
      case 'D':
        changes.deleted.push(file);
        break;
    }
  });

  return changes;
}
