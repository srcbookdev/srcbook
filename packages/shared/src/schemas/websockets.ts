import z from 'zod';
import { CellSchema, CellUpdateAttrsSchema } from './cells.js';

export const CellExecPayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
});

export const CellStopPayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
});

export const CellUpdatePayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
  updates: CellUpdateAttrsSchema,
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

export const CellOutputPayloadSchema = z.object({
  cellId: z.string(),
  output: z.object({
    type: z.enum(['stdout', 'stderr', 'tsc']),
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

// A _message_ over websockets
export const WebSocketMessageSchema = z.tuple([
  z.string(), // The _topic_, eg: "sessions:123"
  z.string(), // The _event_, eg: "cell:updated"
  z.record(z.string(), z.any()), // The _payload_, eg: "{cell: {<cell properties>}}"
]);
