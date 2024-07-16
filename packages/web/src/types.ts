import { CellType, CodeLanguageType, JsonType } from '@srcbook/shared';

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

// TODO: Move to shared and share with API
export type SessionType = {
  id: string;
  dir: string;
  title: string;
  cells: CellType[];
  language: CodeLanguageType;
  'package.json': Record<string, JsonType>;
  'tsconfig.json': Record<string, JsonType>;
  openedAt: number;
};

export type ExampleSrcbookType = {
  id: string;
  path: string;
  title: string;
  dirname: string;
  description: string;
};
