import { marked } from 'marked';
import { cn } from '@/lib/utils';
import { useHotkeys } from 'react-hotkeys-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SessionChannel } from '@/clients/websocket';
import { ListIcon, PackageIcon, SettingsIcon, KeySquareIcon, XIcon } from 'lucide-react';
import type { SessionType } from '@/types';
import KeyboardShortcutsDialog from '@/components/keyboard-shortcuts-dialog';
import FeedbackDialog from '@/components/feedback-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
// import {
//   NavigationMenu,
//   NavigationMenuContent,
//   NavigationMenuList,
//   NavigationMenuItem,
//   NavigationMenuTrigger,
// } from '@/components/ui/navigation-menu';
import SessionMenuPanelTableOfContents from './table-of-contents-panel';
import SessionMenuPanelPackages from './packages-panel';
import SessionMenuPanelSettings from './settings-panel';
// import SessionMenuPanelSecrets from './secrets-panel';

export type SessionMenuPanelContentsProps = {
  session: SessionType;
  channel: SessionChannel;
  openDepsInstallModal: () => void;
};

export const SESSION_MENU_PANELS = [
  {
    name: 'tableOfContents' as const,
    icon: ListIcon,
    openWidthInPx: 264,
    contents: () => <SessionMenuPanelTableOfContents />,
  },
  {
    name: 'packages' as const,
    icon: PackageIcon,
    openWidthInPx: 480,
    contents: ({ session, openDepsInstallModal }: SessionMenuPanelContentsProps) => (
      <SessionMenuPanelPackages session={session} openDepsInstallModal={openDepsInstallModal} />
    ),
  },
  {
    name: 'settings' as const,
    icon: SettingsIcon,
    openWidthInPx: 480,
    contents: (props: SessionMenuPanelContentsProps) => <SessionMenuPanelSettings {...props} />,
  },
  // NOTE: re-enable this in the follow up change!
  // {
  //   name: 'secrets' as const,
  //   icon: KeySquareIcon,
  //   openWidthInPx: 480,
  //   contents: () => <SessionMenuPanelSecrets />,
  // },
];
export type Panel = (typeof SESSION_MENU_PANELS)[0];

type Props = {
  session: SessionType;
  selectedPanelName: Panel['name'];
  selectedPanelOpen: boolean;
  onChangeSelectedPanelNameAndOpen: (
    old: (param: [Panel['name'], boolean]) => [Panel['name'], boolean],
  ) => void;
  openDepsInstallModal: () => void;
  channel: SessionChannel;
};

marked.use({ gfm: true });

// const tocFromCell = (cell: TitleCellType | CodeCellType | MarkdownCellType) => {
//   if (cell.type === 'title') {
//     return cell.text;
//   } else if (cell.type === 'code') {
//     return cell.filename;
//   } else if (cell.type === 'markdown') {
//     const tokens = marked.lexer(cell.text);
//     const heading = tokens.find((token) => token.type === 'heading') as Tokens.Heading | undefined;
//     if (heading) {
//       return heading.text;
//     }
//     const paragraph = tokens.find((token) => token.type === 'paragraph') as
//       | Tokens.Paragraph
//       | undefined;
//     if (paragraph) {
//       return paragraph.text;
//     }
//     return 'Markdown cell';
//   }
// };

const SESSION_MENU_SHEET_PANEL_WIDTH_BREAKPOINT_PX = 1024;

type SessionMenuPanelProps = {
  open: boolean;
  openWidthPx: number;
  onClose: () => void;
  children: React.ReactNode;
};

function SessionMenuPanel(props: SessionMenuPanelProps) {
  const [mode, setMode] = useState<'panel' | 'sheet' | null>(null);
  useEffect(() => {
    // ref: https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver/ResizeObserver#examples
    const observer = new ResizeObserver((entries) => {
      if (entries.length < 1) {
        return;
      }

      const entry = entries[0];
      if (!entry) {
        return;
      }

      const widthInPx = entry.contentRect.width;
      const newMode = widthInPx > SESSION_MENU_SHEET_PANEL_WIDTH_BREAKPOINT_PX ? 'panel' : 'sheet';
      setMode(newMode);
    });

    observer.observe(document.body);
    return () => {
      observer.unobserve(document.body);
    };
  }, []);

  switch (mode) {
    case 'sheet':
      return (
        <div className="fixed inset-0 top-12 z-50 pointer-events-none">
          <Sheet open={props.open} onOpenChange={() => props.onClose()}>
            <SheetContent
              side="left"
              className="overflow-y-auto"
              style={{ width: props.openWidthPx }}
              portal={false}
            >
              {props.children}
            </SheetContent>
          </Sheet>
        </div>
      );

    case 'panel':
    default:
      return (
        /* 1. Wraps the whole thing in a static positioned div that takes up the proper width for */
        /*    alignment */
        <div
          className="hidden lg:block grow-0 shrink-0 transition-all duration-100"
          style={{ width: props.open ? props.openWidthPx : 0 }}
        >
          {/* 2. Fixed position the panel so it doesn't scroll with the page */}
          <div
            className={cn(
              'flex flex-col gap-6 border-r transition-all duration-100 z-50',
              'fixed top-12 left-12 bottom-0 overflow-y-auto bg-background',
              { 'border-r-0': !props.open },
            )}
            style={{ width: props.open ? props.openWidthPx : 0 }}
          >
            <div
              className={cn('absolute top-1 right-1 transition-opacity duration-100', {
                'opacity-0': !props.open,
              })}
            >
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
}

export default function SessionMenu({
  session,
  selectedPanelName,
  selectedPanelOpen,
  onChangeSelectedPanelNameAndOpen,
  openDepsInstallModal,
  channel,
}: Props) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  // FIXME: make sure there's a way to show the feedback modal
  const [showFeedback, setShowFeedback] = useState(false);

  const selectedPanel = useMemo(
    () => SESSION_MENU_PANELS.find((panel) => panel.name === selectedPanelName)!,
    [selectedPanelName],
  );

  // The key '?' is buggy, so we use 'Slash' with 'shift' modifier.
  // This assumes qwerty layout.
  useHotkeys('shift+Slash', () => setShowShortcuts(!showShortcuts));

  // const InnerMenu = () => {
  //   return (
  //     <div className="bg-background space-y-8 text-sm">
  //       <div className="max-w-60 text-tertiary-foreground pr-10">
  //         {cells.map((cell) => {
  //           const isRunningCell = cell.type === 'code' && cell.status === 'running';
  //           return (
  //             <div
  //               key={cell.id}
  //               className={cn(
  //                 'flex items-center py-1 pl-3 gap-2 border-l cursor-pointer',
  //                 isRunningCell
  //                   ? 'text-run border-l-run font-medium'
  //                   : 'hover:border-l-foreground hover:text-foreground',
  //               )}
  //             >
  //               {isRunningCell && <Circle size={14} strokeWidth={3} className="text-run" />}
  //               <p
  //                 className="truncate"
  //                 onClick={() => document.getElementById(`cell-${cell.id}`)?.scrollIntoView()}
  //               >
  //                 {tocFromCell(cell)}
  //               </p>
  //             </div>
  //           );
  //         })}
  //       </div>
  //       {/** actions menus */}
  //       <div className="space-y-1.5 text-tertiary-foreground">
  //         <button
  //           className={cn('flex items-center gap-2 hover:text-foreground cursor-pointer', {
  //             'text-run hover:text-run font-medium': installingDependencies,
  //           })}
  //           onClick={() => setShowSettings(true)}
  //         >
  //           {installingDependencies ? (
  //             <LoaderCircle size={16} className="animate-spin" />
  //           ) : (
  //             <Settings size={16} />
  //           )}
  //           Settings
  //           {dependencyInstallFailed && <span className="text-error">(1)</span>}
  //         </button>
  //         <button
  //           onClick={() => setShowSave(true)}
  //           className="flex items-center gap-2 hover:text-foreground cursor-pointer"
  //         >
  //           <Upload size={16} />
  //           Export
  //         </button>
  //         <button
  //           onClick={() => setShowDelete(true)}
  //           className="flex items-center gap-2 hover:text-foreground cursor-pointer"
  //         >
  //           <Trash2 size={16} />
  //           Delete
  //         </button>
  //         <button
  //           onClick={() => setShowShortcuts(true)}
  //           className="flex items-center gap-2 hover:text-foreground cursor-pointer"
  //         >
  //           <Keyboard size={16} />
  //           Shortcuts
  //         </button>
  //         <button
  //           onClick={() => setShowFeedback(true)}
  //           className="flex items-center gap-2 hover:text-foreground cursor-pointer"
  //         >
  //           <MessageCircleMore size={16} />
  //           Feedback
  //         </button>
  //       </div>
  //     </div>
  //   );
  // };

  const selectedPanelContentsProps: SessionMenuPanelContentsProps = useMemo(
    () => ({ session, channel, openDepsInstallModal }),
    [session, channel, openDepsInstallModal],
  );

  return (
    <>
      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} />
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
          {SESSION_MENU_PANELS.map((panel) => {
            const Icon = panel.icon;
            return (
              <Button
                key={panel.name}
                variant="icon"
                size="icon"
                className="active:translate-y-0"
                onClick={() =>
                  onChangeSelectedPanelNameAndOpen(([oldName, oldOpen]) => {
                    return oldName === panel.name && oldOpen
                      ? [oldName, false]
                      : [panel.name, true];
                  })
                }
              >
                <Icon
                  size={18}
                  className={cn({
                    'stroke-secondary-foreground':
                      selectedPanelOpen && selectedPanelName === panel.name,
                    'stroke-tertiary-foreground':
                      !selectedPanelOpen || selectedPanelName !== panel.name,
                  })}
                />
              </Button>
            );
          })}
        </div>
      </div>

      {/* The opened panel is of a certain defined pixel width whose parent takes the space of the fixed position element: */}
      <SessionMenuPanel
        open={selectedPanelOpen}
        openWidthPx={selectedPanel?.openWidthInPx ?? 0}
        onClose={() => onChangeSelectedPanelNameAndOpen(([name, _open]) => [name, false])}
      >
        {selectedPanel.contents(selectedPanelContentsProps)}
      </SessionMenuPanel>
    </>
  );
}
