import z from 'zod';
import { CellSchema, MarkdownCellSchema, CodeCellSchema, CellUpdateAttrsSchema } from './cells.mjs';
import {
  TsServerDiagnosticSchema,
  TsServerQuickInfoRequestSchema,
  TsServerQuickInfoResponseSchema,
} from './tsserver.mjs';

// A _message_ over websockets
export const WebSocketMessageSchema = z.tuple([
  z.string(), // The _topic_, eg: "sessions:123"
  z.string(), // The _event_, eg: "cell:updated"
  z.record(z.string(), z.any()), // The _payload_, eg: "{cell: {<cell properties>}}"
]);

export const CellExecPayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
});

export const CellStopPayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
});

export const CellCreatePayloadSchema = z.object({
  sessionId: z.string(),
  index: z.number(),
  cell: z.union([MarkdownCellSchema, CodeCellSchema]),
});

export const CellUpdatePayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
  updates: CellUpdateAttrsSchema,
});

export const CellFormatPayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
});

export const AiGenerateCellPayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
  prompt: z.string(),
});

export const AiFixDiagnosticsPayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
  diagnostics: z.string(),
});

export const CellRenamePayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
  filename: z.string(),
});

export const CellDeletePayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
});

export const CellErrorPayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
  errors: z.array(
    z.object({
      message: z.string(),
      attribute: z.string().optional(),
    }),
  ),
});

export const CellUpdatedPayloadSchema = z.object({
  cell: CellSchema,
});

export const AiGeneratedCellPayloadSchema = z.object({
  cellId: z.string(),
  output: z.string(),
});

export const CellOutputPayloadSchema = z.object({
  cellId: z.string(),
  output: z.object({
    type: z.enum(['stdout', 'stderr']),
    data: z.string(),
  }),
});

export const DepsInstallPayloadSchema = z.object({
  sessionId: z.string(),
  packages: z.array(z.string()).optional(),
});

export const DepsValidatePayloadSchema = z.object({
  sessionId: z.string(),
});

export const DepsValidateResponsePayloadSchema = z.object({
  packages: z.array(z.string()).optional(),
});

export const TsServerStartPayloadSchema = z.object({
  sessionId: z.string(),
});

export const TsServerStopPayloadSchema = z.object({
  sessionId: z.string(),
});

export const TsServerCellDiagnosticsPayloadSchema = z.object({
  cellId: z.string(),
  diagnostics: z.array(TsServerDiagnosticSchema),
});

export const TsServerCellSuggestionsPayloadSchema = z.object({
  cellId: z.string(),
  diagnostics: z.array(TsServerDiagnosticSchema),
});

export const TsServerQuickInfoRequestPayloadSchema = z.object({
  cellId: z.string(),
  sessionId: z.string(),
  request: TsServerQuickInfoRequestSchema,
});

export const TsServerQuickInfoResponsePayloadSchema = z.object({
  response: TsServerQuickInfoResponseSchema,
});

export const TsConfigUpdatePayloadSchema = z.object({
  sessionId: z.string(),
  source: z.string(),
});

export const TsConfigUpdatedPayloadSchema = z.object({
  source: z.string(),
});
