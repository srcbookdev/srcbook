import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

export async function getRelativeFileContents(relativePath) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const buffer = await fs.readFile(path.join(__dirname, relativePath));
    return buffer.toString().trim();
  } catch (err) {
    console.error('Error reading file:', err);
  }
}
