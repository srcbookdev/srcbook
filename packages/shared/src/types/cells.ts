import z from 'zod';

import {
  CellSchema,
  TitleCellSchema,
  MarkdownCellSchema,
  PackageJsonCellSchema,
  CodeCellSchema,
  TitleCellUpdateAttrsSchema,
  MarkdownCellUpdateAttrsSchema,
  PackageJsonCellUpdateAttrsSchema,
  CodeCellUpdateAttrsSchema,
  CellUpdateAttrsSchema,
} from '../schemas/cells';

export type TitleCellType = z.infer<typeof TitleCellSchema>;
export type MarkdownCellType = z.infer<typeof MarkdownCellSchema>;
export type PackageJsonCellType = z.infer<typeof PackageJsonCellSchema>;
export type CodeCellType = z.infer<typeof CodeCellSchema>;
export type CellType = z.infer<typeof CellSchema>;

export type TitleCellUpdateAttrsType = z.infer<typeof TitleCellUpdateAttrsSchema>;
export type MarkdownCellUpdateAttrsType = z.infer<typeof MarkdownCellUpdateAttrsSchema>;
export type PackageJsonCellUpdateAttrsType = z.infer<typeof PackageJsonCellUpdateAttrsSchema>;
export type CodeCellUpdateAttrsType = z.infer<typeof CodeCellUpdateAttrsSchema>;
export type CellUpdateAttrsType = z.infer<typeof CellUpdateAttrsSchema>;

export type CellErrorType = {
  message: string;
  attribute?: string;
};
