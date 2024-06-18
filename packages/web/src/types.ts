import { CellType, SrcbookMetadataType } from '@srcbook/shared';

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
  defaultLanguage: 'javascript' | 'typescript';
};

export type StdoutOutputType = { type: 'stdout'; data: string };
export type StderrOutputType = { type: 'stderr'; data: string };
export type TscOutputType = { type: 'tsc'; data: string };
export type OutputType = StdoutOutputType | StderrOutputType | TscOutputType;

export type SessionType = {
  id: string;
  dir: string;
  cells: CellType[];
  metadata: SrcbookMetadataType;
};
