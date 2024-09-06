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
  Settings,
  LoaderCircle,
  Keyboard,
  ListIcon,
  PackageIcon,
  SettingsIcon,
  KeySquareIcon,
  XIcon,
} from 'lucide-react';
import type { SessionType } from '../types';
import type { CodeCellType, MarkdownCellType, TitleCellType } from '@srcbook/shared';
import KeyboardShortcutsDialog from '@/components/keyboard-shortcuts-dialog';
import FeedbackDialog from '@/components/feedback-dialog';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';
import { ExportSrcbookModal } from '@/components/import-export-srcbook-modal';
import { Button } from '@/components/ui/button';
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

type SessionMenuPanelProps = {
  open: boolean;
  openWidthPx: number;
  onClose: () => void;
  children: React.ReactNode;
};

function SessionMenuPanel(props: SessionMenuPanelProps) {
  return (
    // 1. Wraps the whole thing in a static positioned div that takes up the proper width for
    //    alignment
    <div
      className="grow-0 shrink-0 transition-all duration-100"
      style={{ width: props.open ? props.openWidthPx : 0 }}
    >
      {/* 2. Fixed position the panel so it doesn't scroll with the page */}
      <div
        className={cn(
          "flex flex-col gap-6 border-r transition-all duration-100",
          "fixed top-12 left-12 bottom-0 overflow-hidden",
          { "border-r-0": !props.open },
        )}
        style={{ width: props.open ? props.openWidthPx : 0 }}
      >
        <div className={cn("absolute top-1 right-1 transition-opacity duration-100", {
          "opacity-0": !props.open,
        })}>
          <Button variant="icon" size="icon" onClick={props.onClose}>
            <XIcon size={16} />
          </Button>
        </div>

        {/* 3. By again setting the width on this wrapper, the panel closing won't cause text to */}
        {/*    wrap due to intermediate width changes / etc */}
        <div className="p-6" style={{ width: props.openWidthPx }}>
          {props.children}
        </div>
      </div>
    </div>
  );
}

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

  const [openTab, setOpenTab] = useState<'tableOfContents' | 'packages' | 'settings' | 'secrets' | null>(null);

  const { installing: installingDependencies, failed: dependencyInstallFailed } = usePackageJson();

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
            {dependencyInstallFailed && <span className="text-error">(1)</span>}
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

      {/* <div className="fixed xl:hidden top-[100px] left-6 group z-20"> */}
      {/*   <NavigationMenu> */}
      {/*     <NavigationMenuList> */}
      {/*       <NavigationMenuItem> */}
      {/*         <NavigationMenuTrigger> */}
      {/*           <div className="p-2"> */}
      {/*             <List size={24} /> */}
      {/*           </div> */}
      {/*         </NavigationMenuTrigger> */}

      {/*         <NavigationMenuContent className=""> */}
      {/*           <div className="p-6"> */}
      {/*             <InnerMenu /> */}
      {/*           </div> */}
      {/*         </NavigationMenuContent> */}
      {/*       </NavigationMenuItem> */}
      {/*     </NavigationMenuList> */}
      {/*   </NavigationMenu> */}
      {/* </div> */}
      {/* <div className="hidden xl:block fixed top-[72px] left-0 p-6"> */}
      {/*   <InnerMenu /> */}
      {/* </div> */}

      {/* The sidebar is of a certain defined pixel width whoose parent takes the space of the fixed position element: */}
      <div className="grow-0 shrink-0 w-12">
        <div className="fixed top-12 left-0 flex flex-col items-center w-12 py-4 gap-2">
          <Button
            variant="icon"
            size="icon"
            className="active:translate-y-0"
            onClick={() => setOpenTab(old => old === "tableOfContents" ? null : "tableOfContents")}
          >
            <ListIcon size={18} className={cn({ "stroke-secondary-foreground": openTab === "tableOfContents", "stroke-tertiary-foreground": openTab !== "tableOfContents" })} />
          </Button>
          <Button variant="icon" size="icon" className="active:translate-y-0">
            <PackageIcon size={18} className={cn({ "stroke-secondary-foreground": showSettings, "stroke-tertiary-foreground": !showSettings })} />
          </Button>
          <Button variant="icon" size="icon" className="active:translate-y-0">
            <SettingsIcon size={18} className={cn({ "stroke-secondary-foreground": showSettings, "stroke-tertiary-foreground": !showSettings })} />
          </Button>
          <Button variant="icon" size="icon" className="active:translate-y-0">
            <KeySquareIcon size={18} className={cn({ "stroke-secondary-foreground": showSettings, "stroke-tertiary-foreground": !showSettings })} />
          </Button>
        </div>
      </div>

      {/* The opened panel is of a certain defined pixel width whoose parent takes the space of the fixed position element: */}
      <SessionMenuPanel
        open={openTab === "tableOfContents"}
        openWidthPx={240}
        onClose={() => setOpenTab(null)}
      >
        <div>Table of contents:</div>

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
      </SessionMenuPanel>
    </>
  );
}
