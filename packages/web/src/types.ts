import { CellType, CodeLanguageType } from '@srcbook/shared';

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

export const OPENAI_CONFIG = { provider: 'openai', model: 'gpt-4o' } as const;
export const ANTHROPIC_CONFIG = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20240620',
} as const;
export type AiConfigType = typeof OPENAI_CONFIG | typeof ANTHROPIC_CONFIG;

export type SettingsType = {
  baseDir: string;
  defaultLanguage: CodeLanguageType;
  openaiKey?: string | null;
  enabledAnalytics: boolean;
  anthropicKey?: string | null;
  aiConfig: AiConfigType;
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
