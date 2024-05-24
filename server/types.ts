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
  stale: boolean;
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
