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
};

export type StdoutOutputType = { type: 'stdout'; data: string };
export type StderrOutputType = { type: 'stderr'; data: string };
export type OutputType = StdoutOutputType | StderrOutputType;

export type SessionType = {
  id: string;
  path: string;
  cells: CellType[];
  // A unique identifier for this Srcbook which persists cross sessions
  // It is used to store the files on the disk under ~/.srcbook/<dirName>
  dirName: string;
  metadata: SrcbookMetadataType;
};
