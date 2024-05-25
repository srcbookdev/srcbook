import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import Path from 'node:path';
import { encode, decode, newContents } from './srcmd.mjs';
import { CodeCell, MarkdownCell, SessionStore } from './models.mjs';
import { ICodeCell, IMarkdownCell, ISession } from './types';
import { toValidNpmName, randomid } from './utils.mjs';
import { SRCBOOK_DIR } from './config.mjs';
import { exec, addPackage } from './exec.mjs';
import Hub from './hub.mjs';

function pathFor(session: ISession, file: string) {
  return Path.join(session.dir, file);
}

function writeReadme(session: ISession, options: { inline: boolean }) {
  return fs.writeFile(pathFor(session, 'README.md'), encode(session.cells, options), {
    encoding: 'utf8',
  });
}

async function flushSession(session: ISession) {
  const writes = [writeReadme(session, { inline: false })];

  for (const cell of session.cells) {
    if (cell.type === 'package.json') {
      writes.push(
        fs.writeFile(pathFor(session, 'package.json'), cell.source, { encoding: 'utf8' }),
      );
    } else if (cell.type === 'code') {
      writes.push(fs.writeFile(pathFor(session, cell.filename), cell.source, { encoding: 'utf8' }));
    }
  }

  return Promise.all(writes);
}

Hub.on('session:created', async ({ session }) => {
  // Persist session to disk.
  await fs.mkdir(session.dir);
  await flushSession(session);
});

Hub.on('session:updated', async ({ session }) => {
  await flushSession(session);
});

Hub.on('cell:updated', async ({ cell }) => {
  const session = getSession(cell.sessionId);
  await flushSession(session);
});

const sessionStore = new SessionStore();

export function listSessions() {
  return sessionStore.list();
}

export function getSession(id: string) {
  return sessionStore.get(id);
}

export function sessionToResponse(session: ISession) {
  return {
    id: session.id,
    cells: session.cells,
  };
}

export async function createSession({ dirname, title }: { dirname: string; title: string }) {
  if (typeof dirname !== 'string') {
    throw new Error('Invalid dirname');
  }

  if (typeof title !== 'string') {
    throw new Error('Invalid title');
  }

  let basename = toValidNpmName(title);
  if (Path.extname(basename) === '') {
    basename += '.srcmd';
  }

  if (Path.extname(basename) !== '.srcmd') {
    throw new Error(`Sessions cannot be created from file types other than .srcmd`);
  }

  const path = Path.join(dirname, basename);

  // TODO: Check also for permissions. Can the user read and write to the file when it exists?
  if (!existsSync(path)) {
    await fs.writeFile(path, newContents(title), { encoding: 'utf8' });
  }

  const contents = await fs.readFile(path, { encoding: 'utf8' });

  const id = randomid();
  const result = decode(id, contents);

  if (result.error) {
    const errors = result.errors.map((msg) => '  * ' + msg).join('\n');
    throw new Error(`Cannot create session, errors were found when parsing ${path}:\n${errors}`);
  }

  return sessionStore.create({
    id: id,
    dir: Path.join(SRCBOOK_DIR, id),
    cells: result.cells,
  });
}

export function createCell({
  sessionId,
  type,
}: {
  sessionId: string;
  type: 'markdown' | 'code';
}): ICodeCell | IMarkdownCell {
  switch (type) {
    case 'code':
      return new CodeCell({
        id: randomid(),
        sessionId: sessionId,
        source: '',
        language: 'javascript',
        filename: 'untitled.mjs',
      });
    case 'markdown':
      return new MarkdownCell({
        id: randomid(),
        sessionId: sessionId,
        text: '## New Markdown Cell',
      });
    default:
      throw new Error(`Unrecognized cell type ${type}`);
  }
}

export async function execCell(session: ISession, cell: ICodeCell) {
  return exec(cell.filename, { cwd: session.dir });
}

export async function readPackageJsonContentsFromDisk(session: ISession) {
  return fs.readFile(Path.join(session.dir, 'package.json'), { encoding: 'utf8' });
}

export function installPackage(session: ISession, pkg: string) {
  return addPackage({ package: pkg, cwd: session.dir });
}
