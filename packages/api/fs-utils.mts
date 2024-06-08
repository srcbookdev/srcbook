import fs from 'node:fs/promises';

export async function fileExists(filepath: string) {
  try {
    await fs.access(filepath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

export async function readdir(
  path: string,
): Promise<{ exists: true; files: string[] } | { exists: false }> {
  try {
    const files = await fs.readdir(path);
    return { exists: true, files };
  } catch (e) {
    const error = e as Error & { code: string };
    if (error && error.code === 'ENOENT') {
      return { exists: false };
    }
    throw e;
  }
}
