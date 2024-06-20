import { marked } from 'marked';
import { useHotkeys } from 'react-hotkeys-hook';
import type { Tokens } from 'marked';
import { useState } from 'react';
import { Upload, Trash2, MessageCircleQuestion } from 'lucide-react';
import type { SessionType } from '../types';
import type { CodeCellType, MarkdownCellType, TitleCellType } from '@srcbook/shared';
import KeyboardShortcutsDialog from '@/components/keyboard-shortcuts-dialog';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';
import { ExportSrcbookModal } from '@/components/import-export-srcbook-modal';
import { useCells } from './use-cell';

type Props = {
  session: SessionType;
};

marked.use({ gfm: true });

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

export default function SessionMenu({ session }: Props) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showSave, setShowSave] = useState(false);

  const { cells: allCells } = useCells();

  const cells = allCells.filter((cell) => {
    return cell.type === 'title' || cell.type === 'markdown' || cell.type === 'code';
  }) as Array<TitleCellType | CodeCellType | MarkdownCellType>;

  // The key '?' is buggy, so we use 'Slash' with 'shift' modifier.
  // This assumes qwerty layout.
  useHotkeys('shift+Slash', () => setShowShortcuts(!showShortcuts));

  return (
    <div className="hidden xl:block fixed top-24 left-0 bg-background p-6 space-y-8 text-sm">
      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <DeleteSrcbookModal open={showDelete} onOpenChange={setShowDelete} session={session} />
      <ExportSrcbookModal open={showSave} onOpenChange={setShowSave} session={session} />

      {/** table of contents */}
      <div className="max-w-48 text-tertiary-foreground">
        {cells.map((cell) => {
          return (
            <p
              key={cell.id}
              className="py-1 pl-3 hover:text-primary-hover border-l hover:border-l-foreground cursor-pointer truncate"
              onClick={() => document.getElementById(`cell-${cell.id}`)?.scrollIntoView()}
            >
              {tocFromCell(cell)}
            </p>
          );
        })}
      </div>
      {/** actions menus */}
      <div className="space-y-1.5 text-tertiary-foreground">
        <div
          onClick={() => setShowSave(true)}
          className="flex items-center gap-2 hover:text-primary-hover cursor-pointer"
        >
          <Upload size={16} />
          <p>Export</p>
        </div>
        <div
          onClick={() => setShowDelete(true)}
          className="flex items-center gap-2 hover:text-primary-hover cursor-pointer"
        >
          <Trash2 size={16} />
          <p>Delete</p>
        </div>

        <div
          onClick={() => setShowShortcuts(true)}
          className="flex items-center gap-2 hover:text-primary-hover cursor-pointer"
        >
          <MessageCircleQuestion size={16} />
          <p>Shortcuts</p>
        </div>
      </div>
    </div>
  );
}
