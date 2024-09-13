import type { CodeCellType, TsServerDefinitionLocationResponsePayloadType } from '@srcbook/shared';
import { Extension, hoverTooltip } from '@uiw/react-codemirror';
import { mapCMLocationToTsServer } from './util';
import { SessionChannel } from '@/clients/websocket';

/** Hover extension for TS server information */
export function gotoDef(sessionId: string, cell: CodeCellType, channel: SessionChannel): Extension {
  return hoverTooltip(async (view, pos) => {
    if (cell.language !== 'typescript') {
      return null; // bail early if not typescript
    }

    const { from, to, text } = view.state.doc.lineAt(pos);
    let start = pos;
    let end = pos;

    while (start > from && /\w/.test(text[start - from - 1] ?? '')) start--;
    while (end < to && /\w/.test(text[end - from] ?? '')) end++;

    return {
      pos: start,
      end: end,
      create: () => {
        const tooltipContainer = document.createElement('div');
        tooltipContainer.className = 'hidden';

        function callback({ response }: TsServerDefinitionLocationResponsePayloadType) {
          console.log(response);
        }

        return {
          dom: tooltipContainer,
          mount() {
            channel.on('tsserver:cell:definition_location:response', callback);
            channel.push('tsserver:cell:definition_location:request', {
              sessionId: sessionId,
              cellId: cell.id,
              request: { location: mapCMLocationToTsServer(cell.source, pos) },
            });
          },
          destroy() {
            channel.off('tsserver:cell:definition_location:response', callback);
          },
        };
      },
    };
  });
}
