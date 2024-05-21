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
};

export type CodeCellType = {
  id: string;
  stale: boolean;
  type: 'code';
  source: string;
  module: any;
  context: any;
  language: string;
  filename: string;
  output: any[];
};

export type CellType = TitleCellType | MarkdownCellType | PackageJsonCellType | CodeCellType;

export type SessionType = {
  id: string;
  hash: string;
  path: string;
  cells: CellType[];
};
