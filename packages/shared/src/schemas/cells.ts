import z from 'zod';

export const MarkdownCellSchema = z.object({
  id: z.string(),
  type: z.literal('markdown'),
  text: z.string(),
});

export const CodeCellSchema = z.object({
  id: z.string(),
  type: z.literal('code'),
  source: z.string(),
  language: z.enum(['javascript', 'typescript']),
  filename: z.string(),
  status: z.enum(['idle', 'running']),
});

export const CellSchema = z.union([MarkdownCellSchema, CodeCellSchema]);

///////////////////////////////////////////
// ATTRIBUTES ALLOWED IN UPDATE REQUESTS //
///////////////////////////////////////////

export const MarkdownCellUpdateAttrsSchema = z.object({
  text: z.string(),
});

// filename not allowed here because renaming
// a file has a separate websocket message.
export const CodeCellUpdateAttrsSchema = z.object({
  source: z.string(),
});

export const CellUpdateAttrsSchema = z.union([
  MarkdownCellUpdateAttrsSchema,
  CodeCellUpdateAttrsSchema,
]);
