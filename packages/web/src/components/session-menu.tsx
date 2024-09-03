import { marked } from 'marked';
import { useHotkeys } from 'react-hotkeys-hook';
import type { Tokens } from 'marked';
import { useState } from 'react';
import {
  Upload,
  Trash2,
  MessageCircleMore,
  Circle,
  List,
  Settings,
  LoaderCircle,
  Keyboard,
} from 'lucide-react';
import type { CodeCellType, MarkdownCellType, TitleCellType } from '@srcbook/shared';
import type { SessionChannel } from '@/clients/websocket';
import { cn } from '@/lib/utils';
import KeyboardShortcutsDialog from '@/components/keyboard-shortcuts-dialog';
import FeedbackDialog from '@/components/feedback-dialog';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';
import { ExportSrcbookModal } from '@/components/import-export-srcbook-modal';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import type { SessionType } from '../types';
import { useCells } from './use-cell';
import { SettingsSheet } from './settings-sheet';
import { usePackageJson } from './use-package-json';

interface Props {
  session: SessionType;
  showSettings: boolean;
  setShowSettings: (value: boolean) => void;
  openDepsInstallModal: () => void;
  channel: SessionChannel;
}

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

export default function SessionMenu({
  session,
  showSettings,
  setShowSettings,
  openDepsInstallModal,
  channel,
}: Props) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showSave, setShowSave] = useState(false);

  const { installing: installingDependencies, failed: dependencyInstallFailed } = usePackageJson();

  const { cells: allCells } = useCells();

  const cells = allCells.filter((cell) => {
    return cell.type === 'title' || cell.type === 'markdown' || cell.type === 'code';
  }) as (TitleCellType | CodeCellType | MarkdownCellType)[];

  // The key '?' is buggy, so we use 'Slash' with 'shift' modifier.
  // This assumes qwerty layout.
  useHotkeys('shift+Slash', () => { setShowShortcuts(!showShortcuts); });

  function InnerMenu() {
    return (
      <div className="bg-background space-y-8 text-sm">
        <div className="max-w-60 text-tertiary-foreground pr-10">
          {cells.map((cell) => {
            const isRunningCell = cell.type === 'code' && cell.status === 'running';
            return (
              <div
                className={cn(
                  'flex items-center py-1 pl-3 gap-2 border-l cursor-pointer',
                  isRunningCell
                    ? 'text-run border-l-run font-medium'
                    : 'hover:border-l-foreground hover:text-foreground',
                )}
                key={cell.id}
              >
                {isRunningCell ? <Circle className="text-run" size={14} strokeWidth={3} /> : null}
                <p
                  className="truncate"
                  onClick={() => document.getElementById(`cell-${cell.id}`)?.scrollIntoView()}
                >
                  {tocFromCell(cell)}
                </p>
              </div>
            );
          })}
        </div>
        {/** actions menus */}
        <div className="space-y-1.5 text-tertiary-foreground">
          <button
            className={cn('flex items-center gap-2 hover:text-foreground cursor-pointer', {
              'text-run hover:text-run font-medium': installingDependencies,
            })}
            onClick={() => { setShowSettings(true); }}
          >
            {installingDependencies ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Settings size={16} />
            )}
            Settings
            {dependencyInstallFailed ? <span className="text-error">(1)</span> : null}
          </button>
          <button
            className="flex items-center gap-2 hover:text-foreground cursor-pointer"
            onClick={() => { setShowSave(true); }}
          >
            <Upload size={16} />
            Export
          </button>
          <button
            className="flex items-center gap-2 hover:text-foreground cursor-pointer"
            onClick={() => { setShowDelete(true); }}
          >
            <Trash2 size={16} />
            Delete
          </button>
          <button
            className="flex items-center gap-2 hover:text-foreground cursor-pointer"
            onClick={() => { setShowShortcuts(true); }}
          >
            <Keyboard size={16} />
            Shortcuts
          </button>
          <button
            className="flex items-center gap-2 hover:text-foreground cursor-pointer"
            onClick={() => { setShowFeedback(true); }}
          >
            <MessageCircleMore size={16} />
            Feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <KeyboardShortcutsDialog onOpenChange={setShowShortcuts} open={showShortcuts} />
      <FeedbackDialog onOpenChange={setShowFeedback} open={showFeedback} />
      <DeleteSrcbookModal onOpenChange={setShowDelete} open={showDelete} session={session} />
      <ExportSrcbookModal onOpenChange={setShowSave} open={showSave} session={session} />
      <SettingsSheet
        channel={channel}
        onOpenChange={setShowSettings}
        open={showSettings}
        openDepsInstallModal={openDepsInstallModal}
        session={session}
      />
      <div className="fixed xl:hidden top-[100px] left-6 group z-20">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>
                <div className="p-2">
                  <List size={24} />
                </div>
              </NavigationMenuTrigger>

              <NavigationMenuContent className="">
                <div className="p-6">
                  <InnerMenu />
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <div className="hidden xl:block fixed top-[72px] left-0 p-6">
        <InnerMenu />
      </div>
    </>
  );
}
