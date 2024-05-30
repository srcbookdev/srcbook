export interface FsObjectType {
  path: string;
  dirname: string;
  basename: string;
  isDirectory: boolean;
}

export interface FsObjectResultType {
  dirname: string;
  entries: FsObjectType[];
}

export type SettingsType = {
  baseDir: string;
};

export type StdoutOutputType = { type: 'stdout'; data: string };
export type StderrOutputType = { type: 'stderr'; data: string };
export type OutputType = StdoutOutputType | StderrOutputType;

type BaseCellType = {
  id: string;
};

export type TitleCellType = BaseCellType & {
  type: 'title';
  text: string;
};

export type MarkdownCellType = BaseCellType & {
  type: 'markdown';
  text: string;
};

export type CodeCellType = BaseCellType & {
  type: 'code';
  source: string;
  language: string;
  filename: string;
  status: 'idle' | 'running';
};

export type PackageJsonCellType = BaseCellType & {
  type: 'package.json';
  source: string;
  status: 'idle' | 'running';
};

export type CellType = TitleCellType | CodeCellType | MarkdownCellType | PackageJsonCellType;

export type SessionType = {
  id: string;
  path: string;
  cells: CellType[];
};
