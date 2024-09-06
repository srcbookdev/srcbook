import z from 'zod';

import {
  TitleCellSchema,
  MarkdownCellSchema,
  PackageJsonCellSchema,
  CodeCellSchema,
  PlaceholderCellSchema,
  CellSchema,
  CellWithPlaceholderSchema,
  TitleCellUpdateAttrsSchema,
  MarkdownCellUpdateAttrsSchema,
  PackageJsonCellUpdateAttrsSchema,
  CodeCellUpdateAttrsSchema,
  CellUpdateAttrsSchema,
  SrcbookMetadataSchema,
} from '../schemas/cells.mjs';

export type TitleCellType = z.infer<typeof TitleCellSchema>;
export type MarkdownCellType = z.infer<typeof MarkdownCellSchema>;
export type PackageJsonCellType = z.infer<typeof PackageJsonCellSchema>;
export type CodeCellType = z.infer<typeof CodeCellSchema>;
export type PlaceholderCellType = z.infer<typeof PlaceholderCellSchema>;

export type CellType = z.infer<typeof CellSchema>;
export type CellWithPlaceholderType = z.infer<typeof CellWithPlaceholderSchema>;

export type TitleCellUpdateAttrsType = z.infer<typeof TitleCellUpdateAttrsSchema>;
export type MarkdownCellUpdateAttrsType = z.infer<typeof MarkdownCellUpdateAttrsSchema>;
export type PackageJsonCellUpdateAttrsType = z.infer<typeof PackageJsonCellUpdateAttrsSchema>;
export type CodeCellUpdateAttrsType = z.infer<typeof CodeCellUpdateAttrsSchema>;
export type CellUpdateAttrsType = z.infer<typeof CellUpdateAttrsSchema>;

export type CellErrorType = {
  message: string;
  attribute?: string;
};

export type CodeLanguageType = 'javascript' | 'typescript';

export type SrcbookMetadataType = z.infer<typeof SrcbookMetadataSchema>;
