import fs from 'fs/promises';
import Path from 'path';
import util from 'util';
import vm from 'vm';
import { decode, encode } from './jsmd.mjs';
import { randomid, sha256 } from './utils.mjs';
import { transformImportStatements } from './transform.mjs';

const sessions = {};

setInterval(() => {
  for (const session of Object.values(sessions)) {
    maybeWriteToFile(session);
  }
}, 5000);

async function maybeWriteToFile(session) {
  const contents = encode(session.cells);
  const buffer = Buffer.from(contents);
  const hash = await sha256(new Uint8Array(buffer));
  if (session.hash !== hash) {
    await fs.writeFile(session.path, contents, { encoding: 'utf8' });
    session.hash = hash;
  }
}

export async function createSession({ path, new: newSession }) {
  if (Path.extname(path) !== '.jsmd') {
    throw new Error(`path argument must be to a .jsmd file but got ${path}`);
  }

  let contents = '';
  let hash = '';

  if (newSession) {
    const title = Path.basename(path, '.jsmd');
    contents = `# ${title}\n`;
    hash = await sha256(new Uint8Array(Buffer.from(contents)));
  } else {
    const buffer = await fs.readFile(path);
    hash = await sha256(new Uint8Array(buffer));
    contents = buffer.toString();
  }

  const id = randomid();
  const cells = decode(contents);

  sessions[id] = {
    id: id,
    hash: hash,
    path: path,
    cells: cells,
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
        filename: 'untitled.js',
        output: [],
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

  const module = new vm.SourceTextModule(source, {
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
