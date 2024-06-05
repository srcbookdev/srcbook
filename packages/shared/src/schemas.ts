import z from 'zod';

export const CellExecPayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
});

export const CellStopPayloadSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
});

export const CellUpdatedPayloadSchema = z.object({
  cell: z.any(), // TODO: TYPE ME
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

export const DepsValidateResponsePayloadSchema = z.object({
  packages: z.array(z.string()).optional(),
});

export const CellValidatePayloadSchema = z.object({
  cellId: z.string(),
  sessionId: z.string(),
  filename: z.string(),
});

export const CellValidateResponsePayloadSchema = z.object({
  cellId: z.string(),
  filename: z.string(),
  error: z.boolean(),
  message: z.string().optional(),
});

export const DepsValidatePayloadSchema = z.object({
  sessionId: z.string(),
});

// A _message_ over websockets
export const WebSocketMessageSchema = z.tuple([
  z.string(), // The _topic_, eg: "sessions:123"
  z.string(), // The _event_, eg: "cell:updated"
  z.record(z.string(), z.any()), // The _payload_, eg: "{cell: {<cell properties>}}"
]);

export type CellExecPayloadType = z.infer<typeof CellExecPayloadSchema>;
export type CellStopPayloadType = z.infer<typeof CellStopPayloadSchema>;
export type CellUpdatedPayloadType = z.infer<typeof CellUpdatedPayloadSchema>;
export type CellOutputPayloadType = z.infer<typeof CellOutputPayloadSchema>;

export type DepsInstallPayloadType = z.infer<typeof DepsInstallPayloadSchema>;
export type DepsValidateResponsePayloadType = z.infer<typeof DepsValidateResponsePayloadSchema>;
export type DepsValidatePayloadType = z.infer<typeof DepsValidatePayloadSchema>;

export type CellValidatePayloadType = z.infer<typeof CellValidatePayloadSchema>;
export type CellValidateResponsePayloadType = z.infer<typeof CellValidateResponsePayloadSchema>;
