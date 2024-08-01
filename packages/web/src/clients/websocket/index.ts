import {
  CellOutputPayloadSchema,
  CellCreatePayloadSchema,
  AiGenerateCellPayloadSchema,
  AiGeneratedCellPayloadSchema,
  CellUpdatedPayloadSchema,
  DepsValidateResponsePayloadSchema,
  CellExecPayloadSchema,
  CellStopPayloadSchema,
  DepsInstallPayloadSchema,
  DepsValidatePayloadSchema,
  CellUpdatePayloadSchema,
  CellErrorPayloadSchema,
  TsServerStartPayloadSchema,
  TsServerStopPayloadSchema,
  CellDeletePayloadSchema,
  TsServerCellDiagnosticsPayloadSchema,
  CellRenamePayloadSchema,
  TsConfigUpdatePayloadSchema,
  TsConfigUpdatedPayloadSchema,
} from '@srcbook/shared';

import Channel from '@/clients/websocket/channel';
import WebSocketClient from '@/clients/websocket/client';

// Establish websocket connection immediately.
const client = new WebSocketClient('ws://localhost:2150/websocket');

export default client;
const IncomingSessionEvents = {
  'cell:output': CellOutputPayloadSchema,
  'cell:error': CellErrorPayloadSchema,
  'cell:updated': CellUpdatedPayloadSchema,
  'deps:validate:response': DepsValidateResponsePayloadSchema,
  'tsserver:cell:diagnostics': TsServerCellDiagnosticsPayloadSchema,
  'ai:generated': AiGeneratedCellPayloadSchema,
  'tsconfig.json:updated': TsConfigUpdatedPayloadSchema,
};

const OutgoingSessionEvents = {
  'cell:exec': CellExecPayloadSchema,
  'cell:stop': CellStopPayloadSchema,
  'cell:create': CellCreatePayloadSchema,
  'cell:update': CellUpdatePayloadSchema,
  'cell:rename': CellRenamePayloadSchema,
  'cell:delete': CellDeletePayloadSchema,
  'ai:generate': AiGenerateCellPayloadSchema,
  'deps:install': DepsInstallPayloadSchema,
  'deps:validate': DepsValidatePayloadSchema,
  'tsserver:start': TsServerStartPayloadSchema,
  'tsserver:stop': TsServerStopPayloadSchema,
  'tsconfig.json:update': TsConfigUpdatePayloadSchema,
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
