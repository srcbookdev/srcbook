import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import Path from 'node:path';
import util from 'node:util';
import vm, { SourceTextModule } from 'node:vm';
import { decode, encode, newContents } from './srcmd.mts';
import { randomid, sha256 } from './utils.mts';
import { transformImportStatements } from './transform.mts';

const sessions = {};

setInterval(() => {
  for (const session of Object.values(sessions)) {
    maybeWriteToFile(session);
  }
}, 5000);

export async function maybeWriteToFile(session) {
  const contents = encode(session.cells);
  const buffer = Buffer.from(contents);
  const hash = await sha256(new Uint8Array(buffer));
  if (session.hash !== hash) {
    await fs.writeFile(session.path, contents, { encoding: 'utf8' });
    session.hash = hash;
  }
}

export async function createSession({ dirname, basename }) {
  if (typeof dirname !== 'string') {
    throw new Error('Invalid dirname');
  }

  if (typeof basename !== 'string') {
    throw new Error('Invalid basename');
  }

  if (Path.extname(basename) === '') {
    basename = basename + '.srcmd';
  }

  if (Path.extname(basename) !== '.srcmd') {
    throw new Error(`Sessions cannot be created from file types other than .srcmd`);
  }

  const path = Path.join(dirname, basename);

  // TODO: Check also for permissions. Can the user read and write to the file when it exists?
  if (!existsSync(path)) {
    const title = Path.basename(path, '.srcmd');
    await fs.writeFile(path, newContents(title), { encoding: 'utf8' });
  }

  const buffer = await fs.readFile(path);
  const hash = await sha256(new Uint8Array(buffer));
  const contents = buffer.toString();

  const id = randomid();
  const result = decode(contents);

  if (result.error) {
    const errors = result.errors.map((msg) => '  * ' + msg).join('\n');
    throw new Error(`Cannot create session, errors were found when parsing ${path}:\n${errors}`);
  }

  sessions[id] = {
    id: id,
    hash: hash,
    path: path,
    cells: result.cells,
  };

  return sessions[id];
}

export async function updateSession(session, updates) {
  const id = session.id;
  sessions[id] = { ...session, ...updates };
  return sessions[id];
}

export async function findSession(id) {
  return sessions[id];
}

export function sessionToResponse(session) {
  return {
    id: session.id,
    path: session.path,
    cells: session.cells,
  };
}

export function createCell({ type }) {
  switch (type) {
    case 'code':
      return {
        id: randomid(),
        stale: false,
        type: 'code',
        source: '',
        module: null,
        context: null,
        language: 'javascript',
        filename: 'untitled.mjs',
        output: [],
      };
    case 'markdown':
      return {
        id: randomid(),
        type: 'markdown',
        text: '## New Markdown Cell',
        tokens: [],
      };
    default:
      throw new Error(`Unrecognized cell type ${type}`);
  }
}

function contextForCell(ctx) {
  return vm.createContext(ctx ?? {});
}

async function createLinkedModule(session, cell) {
  const { code: source } = transformImportStatements(cell.source, cell.filename);

  const module = new SourceTextModule(source, {
    identifier: cell.filename,
    context: cell.context,
    importModuleDynamically: async function (specifier) {
      if (specifier.startsWith('./')) {
        const filename = specifier.slice(2);
        const importedCell = session.cells.find((cell) => cell.filename === filename);

        if (!importedCell) {
          const err = new Error(
            `Cannot find package '${specifier}' imported from ${cell.filename}`,
          );
          err.code = 'ERR_MODULE_NOT_FOUND';
          throw err;
        }

        if (importedCell.module === null) {
          throw new Error(`Attempted to import unevaluated cell ${specifier}`);
        }

        if (importedCell.module !== null && importedCell.stale === true) {
          throw new Error(`Attempted to import stale cell ${specifier}`);
        }

        return importedCell.module.namespace;
      }

      return import(specifier);
    },
  });

  await module.link(async () => {});

  return module;
}

export async function exec(session, cell, source) {
  // Make a copy of the cell
  cell = {
    ...cell,
    stale: false,
    module: null,
    source: source,
    output: [],
    context: contextForCell({
      console: {
        log(...args) {
          for (const arg of args) {
            cell.output.push({ type: 'stdout', text: util.inspect(arg) });
          }
        },
        error() {
          for (const arg of args) {
            cell.output.push({ type: 'stderr', text: util.inspect(arg) });
          }
        },
      },
    }),
  };

  try {
    const module = await createLinkedModule(session, cell);
    await module.evaluate();
    cell.module = module;
    cell.output.push({ type: 'eval', error: false, text: util.inspect(module.namespace) });
  } catch (error) {
    console.error(`Error while evaluating Cell(id=${cell.id})`);
    console.error(error);
    cell.output.push({ type: 'eval', error: true, text: error.stack });
  }

  // Return copy
  return cell;
}

export function findCell(session, id) {
  return session.cells.find((cell) => cell.id === id);
}

export function replaceCell(session, cell) {
  return session.cells.map((c) => (c.id === cell.id ? cell : c));
}

export function removeCell(session, id) {
  return session.cells.filter((cell) => cell.id !== id);
}
