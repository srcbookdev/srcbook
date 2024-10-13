import z from 'zod';

import { FileSchema } from '../schemas/apps.mjs';
import { CodeLanguageType } from './cells.mjs';

export type AppType = {
  id: string;
  name: string;
  language: CodeLanguageType;
  createdAt: number;
  updatedAt: number;
};

export type DirEntryType = {
  type: 'directory';
  name: string;
  path: string;
  // null if not loaded
  children: FsEntryTreeType | null;
};

export type FileEntryType = {
  type: 'file';
  name: string;
  path: string;
};

export type FsEntryTreeType = Array<FileEntryType | DirEntryType>;

export type FileType = z.infer<typeof FileSchema>;
