import z from 'zod';
import { CellSchema, MarkdownCellSchema, CodeCellSchema, CellUpdateAttrsSchema } from './cells.mjs';
import {
  TsServerDefinitionLocationSchema,
  TsServerDiagnosticSchema,
  TsServerQuickInfoRequestSchema,
  TsServerQuickInfoResponseSchema,
  TsServerCompletionEntriesSchema,
} from './tsserver.mjs';
import { FileSchema } from './apps.mjs';

// A _message_ over websockets
export const WebSocketMessageSchema = z.tuple([
  z.string(), // The _topic_, eg: "sessions:123"
  z.string(), // The _event_, eg: "cell:updated"
  z.record(z.string(), z.any()), // The _payload_, eg: "{cell: {<cell properties>}}"
]);

export const CellExecPayloadSchema = z.object({
  cellId: z.string(),
});

export const CellStopPayloadSchema = z.object({
  cellId: z.string(),
});

export const CellCreatePayloadSchema = z.object({
  index: z.number(),
  cell: z.union([MarkdownCellSchema, CodeCellSchema]),
});

export const CellUpdatePayloadSchema = z.object({
  cellId: z.string(),
  updates: CellUpdateAttrsSchema,
});

export const CellFormatPayloadSchema = z.object({
  cellId: z.string(),
});

export const AiGenerateCellPayloadSchema = z.object({
  cellId: z.string(),
  prompt: z.string(),
});

export const AiFixDiagnosticsPayloadSchema = z.object({
  cellId: z.string(),
  diagnostics: z.string(),
});

export const CellRenamePayloadSchema = z.object({
  cellId: z.string(),
  filename: z.string(),
});

export const CellDeletePayloadSchema = z.object({
  cellId: z.string(),
});

export const CellErrorPayloadSchema = z.object({
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

export const CellFormattedPayloadSchema = z.object({
  cellId: z.string(),
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
  packages: z.array(z.string()).optional(),
});

export const DepsValidatePayloadSchema = z.object({});

export const DepsValidateResponsePayloadSchema = z.object({
  packages: z.array(z.string()).optional(),
});

export const TsServerStartPayloadSchema = z.object({});

export const TsServerStopPayloadSchema = z.object({});

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
  request: TsServerQuickInfoRequestSchema,
});

export const TsServerQuickInfoResponsePayloadSchema = z.object({
  response: TsServerQuickInfoResponseSchema,
});

export const TsServerDefinitionLocationRequestPayloadSchema = z.object({
  cellId: z.string(),
  request: TsServerQuickInfoRequestSchema,
});

export const TsServerDefinitionLocationResponsePayloadSchema = z.object({
  response: TsServerDefinitionLocationSchema,
});

export const TsServerCompletionEntriesPayloadSchema = z.object({
  response: TsServerCompletionEntriesSchema,
});

export const TsConfigUpdatePayloadSchema = z.object({
  source: z.string(),
});

export const TsConfigUpdatedPayloadSchema = z.object({
  source: z.string(),
});

//////////
// APPS //
//////////

export const FilePayloadSchema = z.object({
  file: FileSchema,
});

export const FileCreatedPayloadSchema = z.object({
  file: FileSchema,
});

export const FileUpdatedPayloadSchema = z.object({
  file: FileSchema.partial(),
});

export const FileRenamedPayloadSchema = z.object({
  oldPath: z.string(),
  newPath: z.string(),
});

export const FileDeletedPayloadSchema = z.object({
  path: z.string(),
});

export const PreviewStatusPayloadSchema = z.union([
  z.object({ url: z.string().nullable(), status: z.enum(['booting', 'running']) }),
  z.object({
    url: z.string().nullable(),
    status: z.literal('stopped'),
    stoppedSuccessfully: z.boolean(),
    logs: z.string().nullable(),
  }),
]);

export const PreviewStartPayloadSchema = z.object({});
export const PreviewStopPayloadSchema = z.object({});
