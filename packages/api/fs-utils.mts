import fs from 'node:fs/promises';

export async function fileExists(filepath: string) {
  try {
    await fs.access(filepath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

export async function readFile(
  path: string,
): Promise<{ exists: true; contents: string } | { exists: false }> {
  try {
    const contents = await fs.readFile(path, 'utf8');
    return { exists: true, contents };
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error && error.code === 'ENOENT') {
      return { exists: false };
    }
    throw error;
  }
}

export async function readdir(
  path: string,
): Promise<{ exists: true; files: string[] } | { exists: false }> {
  try {
    const files = await fs.readdir(path);
    return { exists: true, files };
  } catch (e) {
    const error = e as NodeJS.ErrnoException;
    if (error && error.code === 'ENOENT') {
      return { exists: false };
    }
    throw error;
  }
}
