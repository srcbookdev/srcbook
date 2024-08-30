import {
  CodeCellType,
  TsServerQuickInfoRequestPayloadType,
  TsServerQuickInfoResponsePayloadType,
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
export function tsHover(sessionId: string, cell: CodeCellType, channel: SessionChannel): Extension {
  return hoverTooltip(async (view, pos, side) => {
    if (cell.language !== 'typescript') {
      return null; // bail early if not typescript
    }

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

    let response: TsServerQuickInfoResponsePayloadType | null = null;
    channel.on('tsserver:cell:quickinfo:response', (payload) => {
      response = payload;
    });

    // Wait for the response
    while (!response) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    channel.off('tsserver:cell:quickinfo:response', response);

    const hoverInfo = {
      start,
      end,
      // @ts-expect-error -- this is not a never just some async magic
      quickInfo: response.response,
    };

    return {
      pos: hoverInfo.start,
      end: hoverInfo.end,
      create: () => hoverRenderer(hoverInfo, view),
    };
  });
}

import { EditorView, TooltipView } from '@uiw/react-codemirror';

export type TooltipRenderer = (arg0: HoverInfo, editorView: EditorView) => TooltipView;

export const hoverRenderer: TooltipRenderer = (info: HoverInfo) => {
  const dom = document.createElement('div');
  if (info.quickInfo.documentation) {
    for (const part of info.quickInfo.documentation) {
      const span = dom.appendChild(document.createElement('span'));
      if (typeof part === 'string') {
        span.innerText = part;
      } else {
        // TODO: Add styling for each kind
        span.innerText = part.text;
      }
    }
  }
  // Add other quick info fields
  if (info.quickInfo.displayString) {
    const displayDiv = dom.appendChild(document.createElement('div'));
    displayDiv.innerText = info.quickInfo.displayString;
  }

  if (info.quickInfo.kind) {
    const kindDiv = dom.appendChild(document.createElement('div'));
    kindDiv.innerText = `Kind: ${info.quickInfo.kind}`;
  }

  if (info.quickInfo.kindModifiers) {
    const modifiersDiv = dom.appendChild(document.createElement('div'));
    modifiersDiv.innerText = `Modifiers: ${info.quickInfo.kindModifiers}`;
  }
  return { dom };
};
