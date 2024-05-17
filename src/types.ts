import type { Token } from 'marked';

export interface FsObjectType {
  name: string;
  path: string;
  parentPath: string;
  isDirectory: boolean;
}

export interface FsObjectResultType {
  path: string;
  entries: FsObjectType[];
}

export type SettingsType = {
  baseDir: string;
};

export type EvalOutputType = { type: 'eval'; error: boolean; text: string };
export type StdoutOutputType = { type: 'stdout'; text: string };
export type StderrOutputType = { type: 'stderr'; text: string };
export type OutputType = EvalOutputType | StdoutOutputType | StderrOutputType;

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
  tokens: Token[];
  rawText: string;
};

export type CodeCellType = BaseCellType & {
  type: 'code';
  stale: boolean;
  source: string;
  language: number;
  filename: string;
  output: OutputType[];
};

export type CellType = TitleCellType | CodeCellType | MarkdownCellType;
