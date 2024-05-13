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

export type TitleCellType = BaseCellType & {
  type: 'title';
  text: string;
};

export type HeadingCellType = BaseCellType & {
  type: 'heading';
  text: string;
};

export type CodeCellType = BaseCellType & {
  type: 'code';
  source: string;
  language: number;
  filename: string;
};

export type CellType = TitleCellType | HeadingCellType | CodeCellType;
