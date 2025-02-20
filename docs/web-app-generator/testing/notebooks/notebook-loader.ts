import { glob } from 'glob';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function findNotebooks(dir: string): Promise<string[]> {
  // Only look for notebooks in the web-app-generator directory
  const pattern = join(dir, 'web-app-generator/**/*.src.md');
  const files = await glob(pattern);
  
  // Filter out test files
  return files.filter(f => !f.includes('test-harness') && !f.includes('testing/'));
}

export async function loadNotebook(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

export function parseCodeCells(content: string): string[] {
  const cells: string[] = [];
  const lines = content.split('\n');
  let currentCell = '';
  let inCodeBlock = false;
  
  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        cells.push(currentCell);
        currentCell = '';
      }
      inCodeBlock = !inCodeBlock;
    } else if (inCodeBlock) {
      currentCell += line + '\n';
    }
  }
  
  return cells.filter(cell => cell.trim().length > 0);
}
