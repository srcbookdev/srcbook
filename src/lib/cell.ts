import { randomid } from '@/lib/utils';
import type { CodeCellType, MarkdownCellType } from '@/types';

export function createCodeCell(attrs: Partial<CodeCellType> = {}): CodeCellType {
  return {
    source: '',
    language: 'javascript',
    filename: 'untitled.mjs',
    output: [],
    ...attrs,
    id: randomid(),
    type: 'code',
  };
}

export function createMarkdownCell(attrs: Partial<MarkdownCellType> = {}): MarkdownCellType {
  return {
    text: '',
    ...attrs,
    id: randomid(),
    type: 'markdown',
  };
}
