export type StdoutOutputType = {
  type: 'stdout';
  data: string;
};

export type StderrOutputType = {
  type: 'stderr';
  data: string;
};

export type ProcessOutputType = StdoutOutputType | StderrOutputType;

export type CombinedOutputType = {
  stdout: string;
  stderr: string;
};

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
  type: 'code';
  source: string;
  language: string;
  filename: string;
  output: ProcessOutputType[];
};

export type CellType = TitleCellType | MarkdownCellType | PackageJsonCellType | CodeCellType;

export type SessionType = {
  id: string;
  /**
   * Path to the directory containing the srcbook files.
   */
  dir: string;
  /**
   * Path to a .srcmd file containing the srcbook.
   */
  srcmdPath: string;
  cells: CellType[];
};

export interface ITitleCell {
  readonly id: string;
  readonly sessionId: string;
  readonly type: 'title';
  text: string;
  setText(text: string): void;
}

export interface IMarkdownCell {
  readonly id: string;
  readonly sessionId: string;
  readonly type: 'markdown';
  text: string;
  setText(text: string): void;
}

export interface IPackageJsonCell {
  readonly id: string;
  readonly sessionId: string;
  readonly type: 'package.json';
  source: string;
  setSource(source: string): void;
}

export interface ICodeCell {
  readonly id: string;
  readonly sessionId: string;
  readonly type: 'code';
  source: string;
  language: string;
  filename: string;
  setSource(source: string): void;
  setFilename(filename: string): void;
  setLanguage(language: string): void;
}

export type ICell = ITitleCell | IPackageJsonCell | IMarkdownCell | ICodeCell;

export interface ISession {
  readonly id: string;
  readonly dir: string;
  cells: ICell[];
  getCell(id: string): ICell | void;
  addCell(cell: ICell, idx: number): void;
  removeCell(cell: ICell): void;
}
