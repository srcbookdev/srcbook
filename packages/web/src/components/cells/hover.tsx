import type {
  CodeCellType,
  TsServerJsDocTagsType,
  TsServerJSDocType,
  TsServerQuickInfoResponsePayloadType,
} from '@srcbook/shared';
import { Extension, hoverTooltip } from '@uiw/react-codemirror';
import { mapCMLocationToTsServer } from './util';
import { SessionChannel } from '@/clients/websocket';
import { parse } from 'marked';
import { formatCode } from '@/lib/code-theme';
import { type ThemeType } from '@/components/use-theme';

/** Hover extension for TS server information */
export function tsHover(
  sessionId: string,
  cell: CodeCellType,
  channel: SessionChannel,
  theme: ThemeType,
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
        const tooltipContainer = document.createElement('div');
        tooltipContainer.className = 'hidden';

        function callback({ response }: TsServerQuickInfoResponsePayloadType) {
          tooltipContainer.className = 'p-2 space-y-2 max-w-3xl max-h-96 overflow-scroll';
          const signatureNode = formatCode(response.displayString, theme);
          tooltipContainer.appendChild(signatureNode);

          const documentationNode = formatDocumentation(response.documentation);
          if (documentationNode !== null) {
            tooltipContainer.appendChild(documentationNode);
          }

          const tagsNode = formatTags(response.tags);
          if (tagsNode !== null) {
            tooltipContainer.appendChild(tagsNode);
          }
        }

        return {
          dom: tooltipContainer,
          mount() {
            channel.on('tsserver:cell:quickinfo:response', callback);
            channel.push('tsserver:cell:quickinfo:request', {
              sessionId: sessionId,
              cellId: cell.id,
              request: mapCMLocationToTsServer(cell.source, pos),
            });
          },
          destroy() {
            channel.off('tsserver:cell:quickinfo:response', callback);
          },
        };
      },
    };
  });
}

function formatDocumentation(documentation: TsServerJSDocType): HTMLElement | null {
  if (!documentation) {
    return null;
  }

  const text =
    typeof documentation === 'string'
      ? documentation.trim()
      : documentation
          .map((part) => (typeof part === 'string' ? part : `${part.text} kind ${part.kind}`))
          .join('\n\n')
          .trim();

  if (text.length === 0) {
    return null;
  }

  const div = document.createElement('div');
  div.className = 'sb-prose text-tertiary-foreground';
  div.innerHTML = parse(text) as string;

  return div;
}

function formatTags(tags: TsServerJsDocTagsType): HTMLElement | null {
  if (tags.length === 0) {
    return null;
  }

  const div = document.createElement('div');
  div.className = 'sb-prose text-tertiary-foreground space-y-2';

  for (const tag of tags) {
    const tagDiv = document.createElement('div');

    const span = document.createElement('span');
    span.className = 'italic';

    if (tag.name === 'example') {
      span.innerText = '@example';
      tagDiv.appendChild(span);
      tagDiv.appendChild(document.createElement('br'));
    } else {
      span.innerText = `@${tag.name}`;
      tagDiv.appendChild(span);
    }

    if (typeof tag.text === 'string') {
      const span = document.createElement('span');
      span.appendChild(document.createTextNode('\u00A0'));
      span.appendChild(document.createTextNode(tag.text));
      tagDiv.append(span);
    }

    div.appendChild(tagDiv);
  }

  return div;
}
