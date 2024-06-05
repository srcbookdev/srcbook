import {
  CellOutputPayloadSchema,
  CellUpdatedPayloadSchema,
  DepsValidateResponsePayloadSchema,
  CellValidateResponsePayloadSchema,
  CellExecPayloadSchema,
  CellStopPayloadSchema,
  DepsInstallPayloadSchema,
  CellValidatePayloadSchema,
  DepsValidatePayloadSchema,
} from '@srcbook/shared';

import Channel from '@/clients/websocket/channel';
import WebSocketClient from '@/clients/websocket/client';

// Establish websocket connection immediately.
const client = new WebSocketClient('ws://localhost:2150/websocket');

export default client;
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
