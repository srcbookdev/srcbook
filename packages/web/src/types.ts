import { CellType, CodeLanguageType, AiProviderType } from '@srcbook/shared';

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
  openaiKey?: string | null;
  anthropicKey?: string | null;
  enabledAnalytics: boolean;
  aiProvider: AiProviderType;
  aiModel: string;
  aiBaseUrl?: string | null;
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

export type ExampleSrcbookType = {
  id: string;
  path: string;
  title: string;
  dirname: string;
  description: string;
};

export type GenerateAICellType = {
  id: string;
  type: 'generate-ai';
};
