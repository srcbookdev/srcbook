import { CellType, CodeLanguageType, AiProviderType } from '@srcbook/shared';

export interface FsObjectType {
  path: string;
  dirname: string;
  basename: string;
  isDirectory: boolean;
}

export type SettingsType = {
  autoInstallDependencies: boolean;
  baseDir: string;
  defaultLanguage: CodeLanguageType;
  openaiKey?: string | null;
  anthropicKey?: string | null;
  aiProvider: AiProviderType;
  aiModel: string;
  aiBaseUrl?: string | null;
  subscriptionEmail?: string | null;
};

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
  language: CodeLanguageType;
  description: string;
  tags: string[];
};
