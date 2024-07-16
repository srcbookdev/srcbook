import z from 'zod';

import {
  CellSchema,
  MarkdownCellSchema,
  CodeCellSchema,
  MarkdownCellUpdateAttrsSchema,
  CodeCellUpdateAttrsSchema,
  CellUpdateAttrsSchema,
} from '../schemas/cells.js';

export type MarkdownCellType = z.infer<typeof MarkdownCellSchema>;
export type CodeCellType = z.infer<typeof CodeCellSchema>;
export type CellType = z.infer<typeof CellSchema>;

export type MarkdownCellUpdateAttrsType = z.infer<typeof MarkdownCellUpdateAttrsSchema>;
export type CodeCellUpdateAttrsType = z.infer<typeof CodeCellUpdateAttrsSchema>;
export type CellUpdateAttrsType = z.infer<typeof CellUpdateAttrsSchema>;

export type CellErrorType = {
  message: string;
  attribute?: string;
};

export type CodeLanguageType = 'javascript' | 'typescript';
