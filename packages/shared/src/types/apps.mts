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

export type FileType = z.infer<typeof FileSchema>;
