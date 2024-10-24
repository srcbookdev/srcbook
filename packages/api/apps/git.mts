import fs from 'node:fs/promises';
import Path from 'node:path';
import git, { type ReadCommitResult } from 'isomorphic-git';
import { pathToApp } from './disk.mjs';
import type { App as DBAppType } from '../db/schema.mjs';

// Initialize a git repository in the app directory
export async function initRepo(app: DBAppType): Promise<void> {
  const dir = pathToApp(app.externalId);
  await git.init({ fs, dir });
  await commitAllFiles(app, 'Initial commit');
}

// Commit all current files in the app directory
export async function commitAllFiles(app: DBAppType, message: string): Promise<string> {
  const dir = pathToApp(app.externalId);

  // Stage all files
  await git.add({ fs, dir, filepath: '.' });

  // Create commit
  const sha = await git.commit({
    fs,
    dir,
    message,
    author: {
      name: 'Srcbook',
      email: 'ai@srcbook.com',
    },
  });

  return sha;
}

// Checkout to a specific commit
// Use this to revert to a previous commit or "version"
export async function checkoutCommit(app: DBAppType, commitSha: string): Promise<void> {
  const dir = pathToApp(app.externalId);

  await git.checkout({
    fs,
    dir,
    ref: commitSha,
    force: true,
  });
}

// Get commit history
export async function getCommitHistory(
  app: DBAppType,
  limit: number = 100,
): Promise<Array<ReadCommitResult>> {
  const dir = pathToApp(app.externalId);

  const commits = await git.log({
    fs,
    dir,
    depth: limit, // Limit to specified number of commits, default 100
  });

  return commits;
}

// Helper function to ensure the repo exists, initializing it if necessary
export async function ensureRepoExists(app: DBAppType): Promise<void> {
  const dir = pathToApp(app.externalId);
  try {
    await fs.access(Path.join(dir, '.git'));
  } catch (error) {
    // If .git directory doesn't exist, initialize the repo
    await initRepo(app);
  }
}

// Get the current commit SHA
export async function getCurrentCommitSha(app: DBAppType): Promise<string> {
  const dir = pathToApp(app.externalId);
  const currentCommit = await git.resolveRef({ fs, dir, ref: 'HEAD' });
  return currentCommit;
}
