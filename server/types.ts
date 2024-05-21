type TitleCellType = {
  id: string;
  type: 'title';
  text: string;
};

type MarkdownCellType = {
  id: string;
  type: 'markdown';
  text: string;
};

type PackageJsonCellType = {
  id: string;
  type: 'package.json';
  source: string;
};

type CodeCellType = {
  id: string;
  stale: boolean;
  type: 'code';
  source: string;
  module: any;
  context: any;
  language: 'javascript' | 'json';
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
