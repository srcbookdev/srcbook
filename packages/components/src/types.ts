import { CellType, CodeLanguageType } from '@srcbook/shared';

export type GenerateAICellType = {
  id: string;
  type: 'generate-ai';
};

export type StdoutOutputType = { type: 'stdout'; data: string };
export type StderrOutputType = { type: 'stderr'; data: string };
export type OutputType = StdoutOutputType | StderrOutputType;

export type SessionType = {
  id: string;
  cells: CellType[];
  language: CodeLanguageType;
  'tsconfig.json'?: string;
  openedAt: number;
};

export type CellModeType =
  | 'off'
  | 'generating'
  | 'reviewing'
  | 'prompting'
  | 'fixing'
  | 'formatting';
