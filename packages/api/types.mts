import type { CellType, CodeLanguageType, JsonType } from '@srcbook/shared';

/**
 * TODO: Move to shared and share with API
 * TODO: This should be called "SrcbookType"
 */
type BaseSessionType = {
  /**
   * Unique identifier for the srcbook.
   */
  id: string;

  /**
   * Path to the directory containing the srcbook files.
   */
  dir: string;

  /**
   * Title of the srcbook.
   */
  title: string;

  /**
   * Main Srcbook content (code and markdown).
   */
  cells: CellType[];

  /**
   * package.json.
   */
  'package.json': Record<string, JsonType>;

  /**
   * Replace this with updatedAt once we store srcbooks in sqlite.
   */
  openedAt: number;
};

type JavaScriptSessionType = BaseSessionType & {
  language: 'javascript';
};

type TypeScriptSessionType = BaseSessionType & {
  language: 'typescript';

  /**
   * tsconfig.json.
   */
  'tsconfig.json': Record<string, JsonType>;
};

export type SessionType = JavaScriptSessionType | TypeScriptSessionType;
