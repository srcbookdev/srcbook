import { CellType, SrcbookMetadataType, CodeLanguageType } from '@srcbook/shared';

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
  defaultLanguage: CodeLanguageType;
  openaiKey?: string;
  enabledAnalytics: boolean;
};

export type StdoutOutputType = { type: 'stdout'; data: string };
export type StderrOutputType = { type: 'stderr'; data: string };
export type OutputType = StdoutOutputType | StderrOutputType;

export type SessionType = {
  id: string;
  dir: string;
  cells: CellType[];
  metadata: SrcbookMetadataType;
  openedAt: number;
};

export type ExampleSrcbookType = {
  id: string;
  path: string;
  title: string;
  dirname: string;
  description: string;
};

export type GenerateAICodeCellType = {
  id: string;
  type: 'generate-ai-code';
  language: CodeLanguageType;
};
