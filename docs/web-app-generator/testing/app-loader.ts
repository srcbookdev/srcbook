import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function findWebApps(dir: string): Promise<string[]> {
  const pattern = join(dir, '**/package.json');
  const files = await glob(pattern);
  // Filter out node_modules directories
  const filteredFiles = files.filter(f => !f.includes('node_modules'));
  return filteredFiles.map((f: string) => join(f, '..'));
}

export async function loadAppConfig(path: string): Promise<any> {
  const configPath = join(path, 'package.json');
  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content);
}
