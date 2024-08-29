import {
  CodeCellType,
  TsServerQuickInfoRequestPayloadType,
  TsServerQuickInfoResponseType,
} from '@srcbook/shared';
import { Extension, hoverTooltip } from '@uiw/react-codemirror';
import { mapCMLocationToTsServer } from './util';
import { SessionChannel } from '@/clients/websocket';

export interface HoverInfo {
  start: number;
  end: number;
  quickInfo: TsServerQuickInfoResponseType;
}

/** Hover extension for TS server information */
export function hoverExtension(
  sessionId: string,
  cell: CodeCellType,
  channel: SessionChannel,
): Extension {
  // @ts-expect-error -- breaking so meany rules
  return hoverTooltip(async (view, pos, side) => {
    const { from, to, text } = view.state.doc.lineAt(pos);
    let start = pos,
      end = pos;

    while (start > from && /\w/.test(text[start - from - 1])) start--;
    while (end < to && /\w/.test(text[end - from])) end++;

    if ((start == pos && side < 0) || (end == pos && side > 0)) return null;

    const tsServerPosition = mapCMLocationToTsServer(cell.source, pos);

    const request: TsServerQuickInfoRequestPayloadType = {
      sessionId: sessionId,
      cellId: cell.id,
      request: { location: tsServerPosition },
    };

    channel.push('tsserver:cell:quickinfo:request', request);

    // eslint-disable-next-line
    let response: any;
    channel.on('tsserver:cell:quickinfo:response', (payload) => {
      response = payload;
      localStorage.setItem('quickinfo', JSON.stringify(response.response));
      console.log(response);
    });

    // Wait for the response
    while (!response) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const hoverInfo = {
      start,
      end,
      quickInfo: JSON.parse(localStorage.getItem('quickinfo') ?? '{}'),
    };

    console.log('QUICK INFO', hoverInfo);

    return {
      pos: start,
      end: end,
      create: () => tooltipRenderer(hoverInfo),
      above: true,
    };
  });
}

function tooltipRenderer(info: HoverInfo) {
  const div = document.createElement('div');
  if (info.quickInfo.documentation) {
    for (const part of info.quickInfo.documentation) {
      const span = div.appendChild(document.createElement('span'));
      if (typeof part === 'string') {
        span.innerText = part;
      } else {
        span.className = `quick-info-${part.kind}`;
        span.innerText = part.text;
      }
    }
  }
  return div;
}
