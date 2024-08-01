import type { CellType, CodeLanguageType } from '@srcbook/shared';

export type SessionType = {
  id: string;
  /**
   * Path to the directory containing the srcbook files.
   */
  dir: string;
  cells: CellType[];

  /**
   * The language of the srcbook, i.e.: 'typescript' or 'javascript'
   */
  language: CodeLanguageType;

  /**
   * The tsconfig.json file contents.
   */
  'tsconfig.json'?: string;

  /**
   * Replace this with updatedAt once we store srcbooks in sqlite
   */
  openedAt: number;
};
