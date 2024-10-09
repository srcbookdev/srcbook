import { marked, type Tokens } from 'marked';
import { CodeCellType, MarkdownCellType, TitleCellType } from '@srcbook/shared';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCells } from '@srcbook/components/src/components/use-cell';

type PropsType = Record<string, never>;

export default function SessionMenuPanelTableOfContents(_props: PropsType) {
  const { cells: allCells } = useCells();
  const cells = allCells.filter((cell) => {
    return cell.type === 'title' || cell.type === 'markdown' || cell.type === 'code';
  }) as Array<TitleCellType | CodeCellType | MarkdownCellType>;

  return (
    <>
      <h4 className="text-lg font-semibold leading-tight mb-4">Table of contents</h4>

      <div className="max-w-60 text-tertiary-foreground pr-10">
        {cells.map((cell) => {
          const isRunningCell = cell.type === 'code' && cell.status === 'running';
          return (
            <div
              key={cell.id}
              className={cn(
                'flex items-center py-1 pl-3 gap-2 border-l cursor-pointer text-sm',
                isRunningCell
                  ? 'text-run border-l-run font-medium'
                  : 'hover:border-l-foreground hover:text-foreground',
              )}
            >
              {isRunningCell && <Circle size={14} strokeWidth={3} className="text-run" />}
              <button
                className="truncate"
                onClick={() => document.getElementById(`cell-${cell.id}`)?.scrollIntoView()}
              >
                {tocFromCell(cell)}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

const tocFromCell = (cell: TitleCellType | CodeCellType | MarkdownCellType) => {
  if (cell.type === 'title') {
    return cell.text;
  } else if (cell.type === 'code') {
    return cell.filename;
  } else if (cell.type === 'markdown') {
    const tokens = marked.lexer(cell.text);
    const heading = tokens.find((token) => token.type === 'heading') as Tokens.Heading | undefined;
    if (heading) {
      return heading.text;
    }
    const paragraph = tokens.find((token) => token.type === 'paragraph') as
      | Tokens.Paragraph
      | undefined;
    if (paragraph) {
      return paragraph.text;
    }
    return 'Markdown cell';
  }
};
