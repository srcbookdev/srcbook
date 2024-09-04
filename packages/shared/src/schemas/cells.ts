import z from 'zod';

export const TitleCellSchema = z.object({
  id: z.string(),
  type: z.literal('title'),
  text: z.string(),
});

export const MarkdownCellSchema = z.object({
  id: z.string(),
  type: z.literal('markdown'),
  text: z.string(),
});

export const PackageJsonCellSchema = z.object({
  id: z.string(),
  type: z.literal('package.json'),
  source: z.string(),
  filename: z.literal('package.json'),
  status: z.enum(['idle', 'running']),
});

export const CodeCellSchema = z.object({
  id: z.string(),
  type: z.enum(['code', 'markdown']),
  source: z.string(),
  language: z.enum(['javascript', 'typescript']),
  filename: z.string(),
  status: z.enum(['idle', 'running']),
});

// Placeholder cells are used when instructing AI where to insert generated cell(s).
export const PlaceholderCellSchema = z.object({
  id: z.string(),
  type: z.literal('placeholder'),
  text: z.string(),
});

export const CellSchema = z.union([
  TitleCellSchema,
  MarkdownCellSchema,
  PackageJsonCellSchema,
  CodeCellSchema,
]);

export const CellWithPlaceholderSchema = z.union([
  TitleCellSchema,
  MarkdownCellSchema,
  PackageJsonCellSchema,
  CodeCellSchema,
  PlaceholderCellSchema,
]);

// Used to parse metadata from a srcbook header in .src.md.
//
// i.e. <!-- srcbook:{"language": "javascript"} -->
//
export const SrcbookMetadataSchema = z.object({
  language: z.enum(['javascript', 'typescript']),
  'tsconfig.json': z.optional(z.string()),
});

///////////////////////////////////////////
// ATTRIBUTES ALLOWED IN UPDATE REQUESTS //
///////////////////////////////////////////

export const TitleCellUpdateAttrsSchema = z.object({
  text: z.string().max(44, 'Title must be 44 characters or fewer'),
});

export const MarkdownCellUpdateAttrsSchema = z.object({
  text: z.string(),
});

export const PackageJsonCellUpdateAttrsSchema = z.object({
  source: z.string(),
});

// filename not allowed here because renaming
// a file has a separate websocket message.
export const CodeCellUpdateAttrsSchema = z.object({
  source: z.string(),
});

export const CellUpdateAttrsSchema = z.union([
  TitleCellUpdateAttrsSchema,
  MarkdownCellUpdateAttrsSchema,
  PackageJsonCellUpdateAttrsSchema,
  CodeCellUpdateAttrsSchema,
]);
