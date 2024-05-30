export type TitleCellType = {
  id: string;
  type: 'title';
  text: string;
};

export type MarkdownCellType = {
  id: string;
  type: 'markdown';
  text: string;
};

export type PackageJsonCellType = {
  id: string;
  type: 'package.json';
  source: string;
  filename: 'package.json';
};

export type CodeCellType = {
  id: string;
  type: 'code';
  source: string;
  language: string;
  filename: string;
  /**
   * If a process is running, we store an abort controller.
   * This is the mechanism we use to stop a running cell.
   */
  abortController?: AbortController;
};

export type CellType = TitleCellType | MarkdownCellType | PackageJsonCellType | CodeCellType;

export type SessionType = {
  id: string;
  /**
   * Path to the directory containing the srcbook files.
   */
  dir: string;
  cells: CellType[];
};
