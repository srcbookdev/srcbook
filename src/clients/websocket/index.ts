import z from 'zod';
import Channel from '@/clients/websocket/channel';
import WebSocketClient from '@/clients/websocket/client';

// Establish websocket connection immediately.
const client = new WebSocketClient('ws://localhost:2150/websocket');

export default client;

export const CellExecMessageSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
  source: z.string().optional(),
  package: z.string().optional(),
});

export const CellStopMessageSchema = z.object({
  sessionId: z.string(),
  cellId: z.string(),
});

export const CellUpdatedMessageSchema = z.object({
  cell: z.any(), // TODO: TYPE ME
});

export const CellOutputMessageSchema = z.object({
  cellId: z.string(),
  output: z.object({
    type: z.enum(['stdout', 'stderr']),
    data: z.string(),
  }),
});

export type CellExecMessageType = z.infer<typeof CellExecMessageSchema>;
export type CellStopMessageType = z.infer<typeof CellStopMessageSchema>;
export type CellUpdatedMessageType = z.infer<typeof CellUpdatedMessageSchema>;
export type CellOutputMessageType = z.infer<typeof CellOutputMessageSchema>;

const IncomingSessionEvents = {
  'cell:output': CellOutputMessageSchema,
  'cell:updated': CellUpdatedMessageSchema,
};

const OutgoingSessionEvents = {
  'cell:exec': CellExecMessageSchema,
  'cell:stop': CellStopMessageSchema,
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
