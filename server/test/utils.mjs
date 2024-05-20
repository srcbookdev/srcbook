import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

export async function getRelativeFileContents(relativePath) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return await fs.readFile(path.join(__dirname, relativePath), { encoding: 'utf8' });
  } catch (err) {
    console.error('Error reading file:', err);
  }
}
