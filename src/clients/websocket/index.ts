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
  // Packages can be sent when the cell is a package.json cell
  // and it will install only the packages listed in the array
  packages: z.array(z.string()).optional(),
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

export const PkgJsonInstallMessageSchema = z.object({
  // If packages is empty, install all dependencies
  packages: z.array(z.string()).optional(),
});

export const FilenameCheckMessageSchema = z.object({
  filename: z.string(),
});

export const FilenameCheckResultSchema = z.object({
  filename: z.string(),
  exists: z.boolean(),
});

export type CellExecMessageType = z.infer<typeof CellExecMessageSchema>;
export type CellStopMessageType = z.infer<typeof CellStopMessageSchema>;
export type CellUpdatedMessageType = z.infer<typeof CellUpdatedMessageSchema>;
export type CellOutputMessageType = z.infer<typeof CellOutputMessageSchema>;
export type PkgJsonInstallMessageType = z.infer<typeof PkgJsonInstallMessageSchema>;

const IncomingSessionEvents = {
  'cell:output': CellOutputMessageSchema,
  'cell:updated': CellUpdatedMessageSchema,
  'package.json:install': PkgJsonInstallMessageSchema,
  'filename-check': FilenameCheckResultSchema,
};

const OutgoingSessionEvents = {
  'cell:exec': CellExecMessageSchema,
  'cell:stop': CellStopMessageSchema,
  'filename-check': FilenameCheckMessageSchema,
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
