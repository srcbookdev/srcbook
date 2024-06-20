import { marked } from 'marked';
import { useHotkeys } from 'react-hotkeys-hook';
import type { Tokens } from 'marked';
import { useState } from 'react';
import { Upload, Trash2, MessageCircleQuestion } from 'lucide-react';
import type { SessionType } from '../types';
import type { CellType } from '@srcbook/shared';
import KeyboardShortcutsDialog from '@/components/keyboard-shortcuts-dialog';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';
import { ExportSrcbookModal } from '@/components/import-export-srcbook-modal';

type Props = {
  session: SessionType;
};

marked.use({ gfm: true });

const tocFromCell = (cell: CellType) => {
  switch (cell.type) {
    case 'code':
      return cell.filename;
    case 'markdown':
      const tokens = marked.lexer(cell.text);
      const heading = tokens.find((token) => token.type === 'heading') as
        | Tokens.Heading
        | undefined;
      if (heading) {
        return heading.text;
      }
      const paragraph = tokens.find((token) => token.type === 'paragraph') as
        | Tokens.Paragraph
        | undefined;
      if (paragraph) {
        return paragraph.text.slice(0, 15);
      }
      return 'Markdown cell';
    case 'title':
      return cell.text.slice(0, 15);
    default:
      return '';
  }
};

export default function SessionMenu({ session }: Props) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showSave, setShowSave] = useState(false);

  // The key '?' is buggy, so we use 'Slash' with 'shift' modifier.
  // This assumes qwerty layout.
  useHotkeys('shift+Slash', () => setShowShortcuts(!showShortcuts));

  return (
    <div className="fixed top-20 left-0 bg-background p-6 rounded space-y-8 text-sm">
      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <DeleteSrcbookModal open={showDelete} onOpenChange={setShowDelete} session={session} />
      <ExportSrcbookModal open={showSave} onOpenChange={setShowSave} session={session} />

      {/** table of contents */}
      <div className="border-l text-tertiary-foreground py-0 space-y-2">
        {session.cells.map((cell, index) => {
          return (
            <p
              key={`toc-${index}`}
              className="pl-3 hover:text-primary-hover hover:cursor-pointer border-l hover:border-l-foreground -ml-[1px]"
              onClick={() => document.getElementById(`cell-${cell.id}`)?.scrollIntoView()}
            >
              {tocFromCell(cell)}
            </p>
          );
        })}
      </div>
      {/** actions menus */}
      <div className="space-y-1.5">
        <div
          onClick={() => setShowSave(true)}
          className="flex items-center gap-2 hover:cursor-pointer text-tertiary-foreground hover:text-primary-hover"
        >
          <Upload size={16} />
          <p>Export</p>
        </div>
        <div
          onClick={() => setShowDelete(true)}
          className="flex items-center gap-2 hover:cursor-pointer text-tertiary-foreground hover:text-primary-hover"
        >
          <Trash2 size={16} />
          <p>Delete</p>
        </div>

        <div
          onClick={() => setShowShortcuts(true)}
          className="flex items-center gap-2 hover:cursor-pointer text-tertiary-foreground hover:text-primary-hover"
        >
          <MessageCircleQuestion size={16} />
          <p>Shortcuts</p>
        </div>
      </div>
    </div>
  );
}
