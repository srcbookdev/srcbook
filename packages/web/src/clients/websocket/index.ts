import {
  CellOutputPayloadSchema,
  CellCreatePayloadSchema,
  AiGenerateCellPayloadSchema,
  AiGeneratedCellPayloadSchema,
  CellUpdatedPayloadSchema,
  CellFormattedPayloadSchema,
  CellFormatPayloadSchema,
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
  AiFixDiagnosticsPayloadSchema,
  TsServerCellSuggestionsPayloadSchema,
  TsServerQuickInfoRequestPayloadSchema,
  TsServerQuickInfoResponsePayloadSchema,
  TsServerDefinitionLocationResponsePayloadSchema,
  TsServerDefinitionLocationRequestPayloadSchema,
  TsServerCompletionEntriesPayloadSchema,
} from '@srcbook/shared';
import Channel from '@/clients/websocket/channel';
import WebSocketClient from '@/clients/websocket/client';
import SRCBOOK_CONFIG from '@/config';

// Establish websocket connection immediately.
const client = new WebSocketClient(`ws://${SRCBOOK_CONFIG.api.host}/websocket`);

export default client;
const IncomingSessionEvents = {
  'cell:output': CellOutputPayloadSchema,
  'cell:error': CellErrorPayloadSchema,
  'cell:updated': CellUpdatedPayloadSchema,
  'cell:formatted': CellFormattedPayloadSchema,
  'deps:validate:response': DepsValidateResponsePayloadSchema,
  'tsserver:cell:diagnostics': TsServerCellDiagnosticsPayloadSchema,
  'tsserver:cell:suggestions': TsServerCellSuggestionsPayloadSchema,
  'tsserver:cell:quickinfo:response': TsServerQuickInfoResponsePayloadSchema,
  'ai:generated': AiGeneratedCellPayloadSchema,
  'tsconfig.json:updated': TsConfigUpdatedPayloadSchema,
  'tsserver:cell:definition_location:response': TsServerDefinitionLocationResponsePayloadSchema,
  'tsserver:cell:completions:response': TsServerCompletionEntriesPayloadSchema,
};

const OutgoingSessionEvents = {
  'cell:exec': CellExecPayloadSchema,
  'cell:stop': CellStopPayloadSchema,
  'cell:create': CellCreatePayloadSchema,
  'cell:update': CellUpdatePayloadSchema,
  'cell:rename': CellRenamePayloadSchema,
  'cell:delete': CellDeletePayloadSchema,
  'cell:format': CellFormatPayloadSchema,
  'ai:generate': AiGenerateCellPayloadSchema,
  'ai:fix_diagnostics': AiFixDiagnosticsPayloadSchema,
  'deps:install': DepsInstallPayloadSchema,
  'deps:validate': DepsValidatePayloadSchema,
  'tsserver:start': TsServerStartPayloadSchema,
  'tsserver:stop': TsServerStopPayloadSchema,
  'tsserver:cell:quickinfo:request': TsServerQuickInfoRequestPayloadSchema,
  'tsconfig.json:update': TsConfigUpdatePayloadSchema,
  'tsserver:cell:definition_location:request': TsServerDefinitionLocationRequestPayloadSchema,
  'tsserver:cell:completions:request': TsServerQuickInfoRequestPayloadSchema,
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
