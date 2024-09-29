import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import Path from 'node:path';

export async function getRelativeFileContents(relativePath: string) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = Path.dirname(__filename);
  return fs.readFile(Path.join(__dirname, relativePath), { encoding: 'utf8' });
}
