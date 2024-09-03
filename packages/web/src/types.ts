import type { CellType, CodeLanguageType, AiProviderType } from '@srcbook/shared';

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

export interface SettingsType {
  baseDir: string;
  defaultLanguage: CodeLanguageType;
  openaiKey?: string | null;
  anthropicKey?: string | null;
  aiProvider: AiProviderType;
  aiModel: string;
  aiBaseUrl?: string | null;
}

export interface StdoutOutputType { type: 'stdout'; data: string }
export interface StderrOutputType { type: 'stderr'; data: string }
export type OutputType = StdoutOutputType | StderrOutputType;

export interface SessionType {
  id: string;
  cells: CellType[];
  language: CodeLanguageType;
  'tsconfig.json'?: string;
  openedAt: number;
}

export interface ExampleSrcbookType {
  id: string;
  path: string;
  title: string;
  dirname: string;
  language: CodeLanguageType;
  description: string;
  tags: string[];
}

export interface GenerateAICellType {
  id: string;
  type: 'generate-ai';
}
