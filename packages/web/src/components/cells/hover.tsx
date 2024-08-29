import { CodeCellType } from '@srcbook/shared';
import { Extension, hoverTooltip } from '@uiw/react-codemirror';

export interface HoverInfo {
  start: number;
  end: number;
  quickInfo: { displayParts: { cn: string; text: string }[] };
}

export function hoverExtension(cell: CodeCellType): Extension {
  return hoverTooltip((view, pos, side) => {
    const { from, to, text } = view.state.doc.lineAt(pos);
    let start = pos,
      end = pos;

    while (start > from && /\w/.test(text[start - from - 1])) start--;
    while (end < to && /\w/.test(text[end - from])) end++;

    if ((start == pos && side < 0) || (end == pos && side > 0)) return null;

    const mockInfo: HoverInfo = {
      start: 20,
      end: 30,
      quickInfo: {
        displayParts: [
          {
            cn: 'text-green-300',
            text: `Cell: ${cell.filename}`,
          },
          {
            cn: 'block',
            text: '',
          },
          {
            cn: '',
            text: 'export function a(): number',
          },
        ],
      },
    };

    return {
      pos: start,
      end,
      above: false,
      create() {
        const dom = document.createElement('tag-div');
        dom.className = 'cm-tooltip-cursor';
        dom.appendChild(tooltipRenderer(mockInfo));
        return { dom };
      },
    };
  });
}

function tooltipRenderer(info: HoverInfo) {
  const div = document.createElement('div');
  if (info.quickInfo?.displayParts) {
    for (const part of info.quickInfo.displayParts) {
      const span = div.appendChild(document.createElement('span'));
      span.className = part.cn;
      span.innerText = part.text;
    }
  }
  return div;
}
