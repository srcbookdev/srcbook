import z from 'zod';
import Channel from '@/clients/websocket/channel';
import WebSocketClient from '@/clients/websocket/client';

// Establish websocket connection immediately.
const client = new WebSocketClient('ws://localhost:2150/websocket');

export default client;

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

const DepsValidatePayloadSchema = z.object({
  sessionId: z.string(),
});

export type CellExecPayloadType = z.infer<typeof CellExecPayloadSchema>;
export type CellStopPayloadType = z.infer<typeof CellStopPayloadSchema>;
export type CellUpdatedPayloadType = z.infer<typeof CellUpdatedPayloadSchema>;
export type CellOutputPayloadType = z.infer<typeof CellOutputPayloadSchema>;

export type DepsInstallPayloadType = z.infer<typeof DepsInstallPayloadSchema>;
export type DepsValidateResponsePayloadType = z.infer<typeof DepsValidateResponsePayloadSchema>;
export type DepsValidatePayloadType = z.infer<typeof DepsValidatePayloadSchema>;

export type CellValidatePayloadType = z.infer<typeof CellValidatePayloadSchema>;
export type CellValidateResponsePayloadType = z.infer<typeof CellValidateResponsePayloadSchema>;

const IncomingSessionEvents = {
  'cell:output': CellOutputPayloadSchema,
  'cell:updated': CellUpdatedPayloadSchema,
  'deps:validate:response': DepsValidateResponsePayloadSchema,
  'cell:validate:response': CellValidateResponsePayloadSchema,
};

const OutgoingSessionEvents = {
  'cell:exec': CellExecPayloadSchema,
  'cell:stop': CellStopPayloadSchema,
  'deps:install': DepsInstallPayloadSchema,
  'cell:validate': CellValidatePayloadSchema,
  'deps:validate': DepsValidatePayloadSchema,
};

export class SessionChannel extends Channel<
  typeof IncomingSessionEvents,
  typeof OutgoingSessionEvents
> {
  static create(sessionId: string) {
    return new SessionChannel(client, `session:${sessionId}`, {
      incoming: IncomingSessionEvents,
      outgoing: OutgoingSessionEvents,
    });
  }
}
