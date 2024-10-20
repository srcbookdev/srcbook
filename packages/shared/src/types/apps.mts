import z from 'zod';

import { FileSchema } from '../schemas/apps.mjs';

export type AppType = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export interface DirEntryType {
  type: 'directory';
  // The full path relative to app root, e.g. src/assets
  path: string;
  // The path dirname relative to app root, e.g. src
  dirname: string;
  // The path basename relative to app root, e.g. assets
  basename: string;
  // null if not loaded
  children: FsEntryTreeType | null;
}

export interface FileEntryType {
  type: 'file';
  // The full path relative to app root, e.g. src/components/input.tsx
  path: string;
  // The path dirname relative to app root, e.g. src/components
  dirname: string;
  // The path basename relative to app root, e.g. input.tsx
  basename: string;
}

export type FsEntryTreeType = Array<FileEntryType | DirEntryType>;

export type FileType = z.infer<typeof FileSchema>;
