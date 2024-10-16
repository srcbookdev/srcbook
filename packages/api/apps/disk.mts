import type { RmOptions } from 'node:fs';
import fs from 'node:fs/promises';
import type { Project } from '../ai/app-parser.mjs';
import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type App as DBAppType } from '../db/schema.mjs';
import { APPS_DIR } from '../constants.mjs';
import { toValidPackageName } from './utils.mjs';
import { DirEntryType, FileEntryType, FileType } from '@srcbook/shared';
import { FileContent } from '../ai/app-parser.mjs';
import type { Plan } from '../ai/plan-parser.mjs';

export function pathToApp(id: string) {
  return Path.join(APPS_DIR, id);
}

function pathToTemplate(template: string) {
  return Path.resolve(fileURLToPath(import.meta.url), '..', 'templates', template);
}

export function deleteViteApp(id: string) {
  return fs.rm(pathToApp(id), { recursive: true });
}

export async function applyPlan(app: DBAppType, plan: Plan) {
  const appPath = pathToApp(app.externalId);
  try {
    for (const item of plan.actions) {
      if (item.type === 'file') {
        const filePath = Path.join(appPath, item.path);
        const dirPath = Path.dirname(filePath);
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(filePath, item.modified);
      }
    }
  } catch (e) {
    console.error('Error applying plan to app', app.externalId, e);
    throw e;
  }
}

export async function createAppFromProject(app: DBAppType, project: Project) {
  const appPath = pathToApp(app.externalId);

  await fs.mkdir(appPath, { recursive: true });

  for (const item of project.items) {
    if (item.type === 'file') {
      const filePath = Path.join(appPath, item.filename);
      const dirPath = Path.dirname(filePath);

      // Create nested directories if they don't exist
      try {
        await fs.stat(dirPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          await fs.mkdir(dirPath, { recursive: true });
        } else {
          throw error;
        }
      }

      // Write the file content
      await fs.writeFile(filePath, item.content);
    } else if (item.type === 'command') {
      // For now, we'll just log the commands
      // TODO: execute the commands in the right order.
      console.log(`Command to execute: ${item.content}`);
    }
  }
  return app;
}

export async function createViteApp(app: DBAppType) {
  const appPath = pathToApp(app.externalId);

  // Use recursive because its parent directory may not exist.
  await fs.mkdir(appPath, { recursive: true });

  // Scaffold all the necessary project files.
  await scaffold(app, appPath);

  return app;
}

/**
 * Scaffolds a new Vite app with the specified language.
 * Uses the react-typescript/ or react-javascript dirs as templates,
 * then updates the package.json name and index.html with the app name.
 *
 * @param {DBAppType} app - The database app object.
 * @param {string} destDir - The destination directory for the app.
 * @returns {Promise<void>}
 */
async function scaffold(app: DBAppType, destDir: string) {
  const template = `react-${app.language}`;

  function write(file: string, content?: string) {
    const targetPath = Path.join(destDir, file);
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

export async function loadDirectory(
  app: DBAppType,
  path: string,
  excludes = ['node_modules', 'dist', '.git'],
): Promise<DirEntryType> {
  const projectDir = Path.join(APPS_DIR, app.externalId);
  const dirPath = Path.join(projectDir, path);
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const children = entries
    .filter((entry) => excludes.indexOf(entry.name) === -1)
    .map((entry) => {
      const fullPath = Path.join(dirPath, entry.name);
      const relativePath = Path.relative(projectDir, fullPath);

      if (entry.isDirectory()) {
        return {
          type: 'directory' as const,
          name: entry.name,
          path: relativePath,
          children: null,
        };
      } else {
        return {
          type: 'file' as const,
          name: entry.name,
          path: relativePath,
        };
      }
    });

  const relativePath = Path.relative(projectDir, dirPath);
  const basename = Path.basename(relativePath);

  return {
    type: 'directory' as const,
    name: basename === '' ? '.' : basename,
    path: relativePath === '' ? '.' : relativePath,
    children: children,
  };
}

export async function createDirectory(
  app: DBAppType,
  dirname: string,
  basename: string,
): Promise<DirEntryType> {
  const projectDir = Path.join(APPS_DIR, app.externalId);
  const dirPath = Path.join(projectDir, dirname, basename);

  await fs.mkdir(dirPath, { recursive: false });

  const relativePath = Path.relative(projectDir, dirPath);

  return {
    type: 'directory' as const,
    name: Path.basename(relativePath),
    path: relativePath,
    children: null,
  };
}

export function deleteDirectory(app: DBAppType, path: string) {
  return deleteEntry(app, path, { recursive: true, force: true });
}

export async function renameDirectory(
  app: DBAppType,
  path: string,
  name: string,
): Promise<DirEntryType> {
  const result = await rename(app, path, name);
  return { ...result, type: 'directory' as const, children: null };
}

export async function loadFile(app: DBAppType, path: string): Promise<FileType> {
  const projectDir = Path.join(APPS_DIR, app.externalId);
  const filePath = Path.join(projectDir, path);
  const relativePath = Path.relative(projectDir, filePath);
  const basename = Path.basename(filePath);

  if (isBinary(basename)) {
    return { path: relativePath, name: basename, source: `TODO: handle this`, binary: true };
  } else {
    return {
      path: relativePath,
      name: basename,
      source: await fs.readFile(filePath, 'utf-8'),
      binary: false,
    };
  }
}

export async function createFile(
  app: DBAppType,
  dirname: string,
  basename: string,
  source: string,
): Promise<FileEntryType> {
  const projectDir = Path.join(APPS_DIR, app.externalId);
  const filePath = Path.join(projectDir, dirname, basename);

  // Create intermediate directories if they don't exist
  await fs.mkdir(Path.dirname(filePath), { recursive: true });

  await fs.writeFile(filePath, source, 'utf-8');
  const relativePath = Path.relative(projectDir, filePath);
  return { type: 'file' as const, path: relativePath, name: Path.basename(filePath) };
}

export function deleteFile(app: DBAppType, path: string) {
  return deleteEntry(app, path);
}

export async function renameFile(
  app: DBAppType,
  path: string,
  name: string,
): Promise<FileEntryType> {
  const result = await rename(app, path, name);
  return { ...result, type: 'file' as const };
}

async function rename(app: DBAppType, path: string, name: string) {
  const projectDir = Path.join(APPS_DIR, app.externalId);
  const oldPath = Path.join(projectDir, path);
  const dirname = Path.dirname(oldPath);
  const newPath = Path.join(dirname, name);
  await fs.rename(oldPath, newPath);
  const relativePath = Path.relative(projectDir, newPath);
  const basename = Path.basename(newPath);
  return { name: basename, path: relativePath };
}

function deleteEntry(app: DBAppType, path: string, options: RmOptions = {}) {
  const filePath = Path.join(APPS_DIR, app.externalId, path);
  return fs.rm(filePath, options);
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

export async function getFlatFilesForApp(id: string): Promise<FileContent[]> {
  const appPath = pathToApp(id);
  return getFlatFiles(appPath);
}

async function getFlatFiles(dir: string, basePath: string = ''): Promise<FileContent[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files: FileContent[] = [];

  for (const entry of entries) {
    const relativePath = Path.join(basePath, entry.name);
    const fullPath = Path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') {
        files = files.concat(await getFlatFiles(fullPath, relativePath));
      }
    } else if (entry.isFile() && entry.name !== 'package-lock.json') {
      const content = await fs.readFile(fullPath, 'utf-8');
      files.push({ filename: relativePath, content });
    }
  }

  return files;
}
