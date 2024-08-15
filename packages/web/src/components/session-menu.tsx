import { marked } from 'marked';
import { cn } from '@/lib/utils';
import { useHotkeys } from 'react-hotkeys-hook';
import type { Tokens } from 'marked';
import { useState } from 'react';
import { SessionChannel } from '@/clients/websocket';
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
import type { SessionType } from '../types';
import type { CodeCellType, MarkdownCellType, TitleCellType } from '@srcbook/shared';
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
import { useCells } from './use-cell';
import { SettingsSheet } from './settings-sheet';
import { usePackageJson } from './use-package-json';

type Props = {
  session: SessionType;
  showSettings: boolean;
  setShowSettings: (value: boolean) => void;
  openDepsInstallModal: () => void;
  channel: SessionChannel;
  aiEnabled: boolean;
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

  const { installing: installingDependencies } = usePackageJson();

  const { cells: allCells } = useCells();

  const cells = allCells.filter((cell) => {
    return cell.type === 'title' || cell.type === 'markdown' || cell.type === 'code';
  }) as Array<TitleCellType | CodeCellType | MarkdownCellType>;

  // The key '?' is buggy, so we use 'Slash' with 'shift' modifier.
  // This assumes qwerty layout.
  useHotkeys('shift+Slash', () => setShowShortcuts(!showShortcuts));

  const InnerMenu = () => {
    return (
      <div className="bg-background space-y-8 text-sm">
        <div className="max-w-60 text-tertiary-foreground pr-10">
          {cells.map((cell) => {
            const isRunningCell = cell.type === 'code' && cell.status === 'running';
            return (
              <div
                key={cell.id}
                className={cn(
                  'flex items-center py-1 pl-3 gap-2 border-l cursor-pointer',
                  isRunningCell
                    ? 'text-run border-l-run font-medium'
                    : 'hover:border-l-foreground hover:text-foreground',
                )}
              >
                {isRunningCell && <Circle size={14} strokeWidth={3} className="text-run" />}
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
            onClick={() => setShowSettings(true)}
          >
            {installingDependencies ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Settings size={16} />
            )}
            Settings
          </button>
          <button
            onClick={() => setShowSave(true)}
            className="flex items-center gap-2 hover:text-foreground cursor-pointer"
          >
            <Upload size={16} />
            Export
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 hover:text-foreground cursor-pointer"
          >
            <Trash2 size={16} />
            Delete
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-2 hover:text-foreground cursor-pointer"
          >
            <Keyboard size={16} />
            Shortcuts
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-2 hover:text-foreground cursor-pointer"
          >
            <MessageCircleMore size={16} />
            Feedback
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} />
      <DeleteSrcbookModal open={showDelete} onOpenChange={setShowDelete} session={session} />
      <ExportSrcbookModal open={showSave} onOpenChange={setShowSave} session={session} />
      <SettingsSheet
        open={showSettings}
        onOpenChange={setShowSettings}
        openDepsInstallModal={openDepsInstallModal}
        session={session}
        channel={channel}
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
