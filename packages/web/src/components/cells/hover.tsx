import {
  CodeCellType,
  TsServerQuickInfoRequestPayloadType,
  TsServerQuickInfoResponsePayloadType,
  TsServerQuickInfoResponseType,
} from '@srcbook/shared';
import { Extension, hoverTooltip, EditorView, EditorState } from '@uiw/react-codemirror';
import { mapCMLocationToTsServer } from './util';
import { SessionChannel } from '@/clients/websocket';
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { javascript } from '@codemirror/lang-javascript';
import { parse } from 'marked';
import { type ThemeExtensionType } from '@/components/use-theme';

/** Hover extension for TS server information */
export function tsHover(
  sessionId: string,
  cell: CodeCellType,
  channel: SessionChannel,
  codeTheme: ThemeExtensionType,
): Extension {
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
        let innerView: EditorView | null = null;

        function callback(payload: TsServerQuickInfoResponsePayloadType) {
          innerView = new EditorView({
            doc: payload.response.displayString,
            extensions: [
              javascript({ typescript: true }),
              EditorState.readOnly.of(true),
              codeTheme,
            ],
          });

          tooltipView.dom.appendChild(innerView.dom);

          const documentation = payload.response.documentation;
          if (typeof documentation === 'string') {
            const div = document.createElement('div');
            div.className = 'p-2 sb-prose text-tertiary-foreground';
            div.innerHTML = parse(documentation) as string;
            tooltipView.dom.appendChild(div);
          }
        }

        const tooltipView = {
          dom: document.createElement('div'),
          mount() {
            const request: TsServerQuickInfoRequestPayloadType = {
              sessionId: sessionId,
              cellId: cell.id,
              request: { location: mapCMLocationToTsServer(cell.source, pos) },
            };
            channel.on('tsserver:cell:quickinfo:response', callback);
            channel.push('tsserver:cell:quickinfo:request', request);
          },
          destroy() {
            channel.off('tsserver:cell:quickinfo:response', callback);
            innerView?.destroy();
          },
        };

        return tooltipView;
      },
    };
  });
}

function Tooltip({
  sessionId,
  cell,
  channel,
  pos,
}: {
  sessionId: string;
  cell: CodeCellType;
  channel: SessionChannel;
  pos: number;
}) {
  const [hoverInfo, setHoverInfo] = useState<TsServerQuickInfoResponseType | null>(null);

  useEffect(() => {
    if (cell.language !== 'typescript') {
      setHoverInfo(null);
      return;
    }

    const tsServerPosition = mapCMLocationToTsServer(cell.source, pos);

    const request: TsServerQuickInfoRequestPayloadType = {
      sessionId: sessionId,
      cellId: cell.id,
      request: { location: tsServerPosition },
    };

    channel.push('tsserver:cell:quickinfo:request', request);

    function callback(payload: TsServerQuickInfoResponsePayloadType) {
      setHoverInfo(payload.response);
      channel.off('tsserver:cell:quickinfo:response', callback);
    }

    channel.on('tsserver:cell:quickinfo:response', callback);
  }, [cell, channel, pos, sessionId]);

  if (!hoverInfo) return null;

  return (
    <div className="p-2 space-y-3 max-w-lg max-h-64 text-xs overflow-auto relative">
      {hoverInfo.displayString && <span>{hoverInfo.displayString}</span>}
      {hoverInfo.documentation && (
        <div>
          {typeof hoverInfo.documentation === 'string' ? (
            <span className="text-tertiary-foreground pt-2 whitespace-pre-wrap">
              {hoverInfo.documentation}
            </span>
          ) : (
            hoverInfo.documentation.map((part, index) => (
              <span key={index} className="text-tertiary-foreground pt-2 whitespace-pre-wrap">
                {typeof part === 'string' ? part : `${part.text} kind ${part.kind}`}
              </span>
            ))
          )}
        </div>
      )}
      {hoverInfo.tags.length > 0 && (
        <div>
          {hoverInfo.tags.map((part, index) => (
            <span key={part.name + index.toString()}>
              <span className="italic">
                {part.name === 'example' ? '@example' : `@${part.name} - `}
              </span>
              {part.name === 'example' && <br />}
              <span className="text-tertiary-foreground whitespace-pre-wrap">
                {typeof part === 'string'
                  ? part
                  : typeof part.text === 'string'
                    ? part.text
                    : part.text?.map((text) => text.text).join('\n')}
              </span>
              <br />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export const hoverRenderer = ({
  sessionId,
  cell,
  channel,
  pos,
}: {
  sessionId: string;
  cell: CodeCellType;
  channel: SessionChannel;
  pos: number;
}) => {
  const dom = document.createElement('div');

  const root = createRoot(dom);
  root.render(<Tooltip sessionId={sessionId} cell={cell} channel={channel} pos={pos} />);

  return { dom };
};
