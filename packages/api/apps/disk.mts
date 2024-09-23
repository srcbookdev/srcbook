import fs from 'node:fs/promises';
import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type App as DBAppType } from '../db/schema.mjs';
import { APPS_DIR } from '../constants.mjs';
import { toValidPackageName } from './utils.mjs';
import { Dirent } from 'node:fs';
import { FileType } from '@srcbook/shared';

const FILES_TO_RENAME: Record<string, string | undefined> = {
  _gitignore: '.gitignore',
};

export function pathToApp(id: string) {
  return Path.join(APPS_DIR, id);
}

function pathToTemplate(template: string) {
  return Path.resolve(fileURLToPath(import.meta.url), '..', 'templates', template);
}

export function deleteViteApp(id: string) {
  return fs.rm(pathToApp(id), { recursive: true });
}

export async function createViteApp(app: DBAppType) {
  const appPath = pathToApp(app.externalId);

  // Use recursive because its parent directory may not exist.
  await fs.mkdir(appPath, { recursive: true });

  // Scaffold all the necessary project files.
  await scaffold(app, appPath);

  return app;
}

async function scaffold(app: DBAppType, destDir: string) {
  const template = `react-${app.language}`;

  function write(file: string, content?: string) {
    const targetPath = Path.join(destDir, FILES_TO_RENAME[file] ?? file);
    return content === undefined
      ? copy(Path.join(templateDir, file), targetPath)
      : fs.writeFile(targetPath, content, 'utf-8');
  }

  const templateDir = pathToTemplate(template);
  const files = await fs.readdir(templateDir);
  for (const file of files.filter((f) => f !== 'package.json')) {
    await write(file);
  }

  const [pkgContents, idxContents] = await Promise.all([
    fs.readFile(Path.join(templateDir, 'package.json'), 'utf-8'),
    fs.readFile(Path.join(templateDir, 'index.html'), 'utf-8'),
  ]);

  const pkg = JSON.parse(pkgContents);
  pkg.name = toValidPackageName(app.name);
  const updatedPkgContents = JSON.stringify(pkg, null, 2) + '\n';

  const updatedIdxContents = idxContents.replace(
    /<title>.*<\/title>/,
    `<title>${app.name}</title>`,
  );

  await Promise.all([
    write('package.json', updatedPkgContents),
    write('index.html', updatedIdxContents),
  ]);
}

export function fileUpdated(app: DBAppType, file: FileType) {
  const path = Path.join(pathToApp(app.externalId), file.path);
  return fs.writeFile(path, file.source, 'utf-8');
}

async function copy(src: string, dest: string) {
  const stat = await fs.stat(src);
  if (stat.isDirectory()) {
    return copyDir(src, dest);
  } else {
    return fs.copyFile(src, dest);
  }
}

async function copyDir(srcDir: string, destDir: string) {
  await fs.mkdir(destDir, { recursive: true });
  const files = await fs.readdir(srcDir);
  for (const file of files) {
    const srcFile = Path.resolve(srcDir, file);
    const destFile = Path.resolve(destDir, file);
    await copy(srcFile, destFile);
  }
}

// TODO: This does not scale.
export async function getProjectFiles(app: DBAppType) {
  const projectDir = Path.join(APPS_DIR, app.externalId);

  const { files, directories } = await getDiskEntries(projectDir, {
    exclude: ['node_modules', 'dist', '.git'],
  });

  const nestedFiles = await Promise.all(
    directories.flatMap(async (dir) => {
      const entries = await fs.readdir(Path.join(projectDir, dir.name), {
        withFileTypes: true,
        recursive: true,
      });
      return entries.filter((entry) => entry.isFile());
    }),
  );

  const entries = [...files, ...nestedFiles.flat()];

  return Promise.all(
    entries.map(async (entry) => {
      const fullPath = Path.join(entry.parentPath, entry.name);
      const relativePath = Path.relative(projectDir, fullPath);
      const contents = await fs.readFile(fullPath);
      const binary = isBinary(entry.name);
      const source = !binary ? contents.toString('utf-8') : `TODO: handle this`;
      return { path: relativePath, source, binary };
    }),
  );
}

async function getDiskEntries(projectDir: string, options: { exclude: string[] }) {
  const result: { files: Dirent[]; directories: Dirent[] } = {
    files: [],
    directories: [],
  };

  for (const entry of await fs.readdir(projectDir, { withFileTypes: true })) {
    if (options.exclude.includes(entry.name)) {
      continue;
    }

    if (entry.isFile()) {
      result.files.push(entry);
    } else {
      result.directories.push(entry);
    }
  }

  return result;
}

// TODO: This does not scale.
// What's the best way to know whether a file is a "binary"
// file or not? Inspecting bytes for invalid utf8?
const TEXT_FILE_EXTENSIONS = [
  '.ts',
  '.cts',
  '.mts',
  '.tsx',
  '.js',
  '.cjs',
  '.mjs',
  '.jsx',
  '.md',
  '.markdown',
  '.json',
  '.css',
  '.html',
];

function isBinary(basename: string) {
  const isDotfile = basename.startsWith('.'); // Assume these are text for now, e.g., .gitignore
  const isTextFile = TEXT_FILE_EXTENSIONS.includes(Path.extname(basename));
  return !(isDotfile || isTextFile);
}
