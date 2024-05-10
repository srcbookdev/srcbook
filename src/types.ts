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

export type EvalOutputType = { type: 'eval'; error: boolean; text: string };
export type StdoutOutputType = { type: 'stdout'; text: string };
export type OutputType = EvalOutputType | StdoutOutputType;

type BaseCellType = {
  id: string;
  stale: boolean;
  output: OutputType[];
};

export type HeadingCellType = BaseCellType & {
  type: 'heading';
  text: string;
  depth: 1 | 2;
};

export type CodeCellType = BaseCellType & {
  type: 'code';
  source: string;
  language: number;
};

export type CellType = HeadingCellType | CodeCellType;
