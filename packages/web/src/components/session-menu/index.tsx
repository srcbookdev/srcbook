import { marked } from 'marked';
import { cn } from '@/lib/utils';
import { useHotkeys } from 'react-hotkeys-hook';
import { useEffect, useMemo, useState } from 'react';
import { SessionChannel } from '@/clients/websocket';
import {
  KeyboardIcon,
  ListIcon,
  MessageCircleIcon,
  PackageIcon,
  SettingsIcon,
  KeySquareIcon,
  XIcon,
} from 'lucide-react';
import type { SessionType } from '@/types';
import KeyboardShortcutsDialog from '@/components/keyboard-shortcuts-dialog';
import FeedbackDialog from '@/components/feedback-dialog';
import { Button } from '@srcbook/components/src/components/ui/button';
import { Sheet, SheetContent } from '@srcbook/components/src/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@srcbook/components/src/components/ui/tooltip';
import SessionMenuPanelTableOfContents from './table-of-contents-panel';
import SessionMenuPanelPackages from './packages-panel';
import SessionMenuPanelSettings from './settings-panel';
import SessionMenuPanelSecrets from './secrets-panel';

export type SessionMenuPanelContentsProps = {
  readOnly: boolean;
  session: SessionType;
  channel: SessionChannel | null;
  openDepsInstallModal: (() => void) | null;
};

export const SESSION_MENU_PANELS = [
  {
    name: 'tableOfContents' as const,
    icon: ListIcon,
    openWidthInPx: 312,
    contents: () => <SessionMenuPanelTableOfContents />,
    tooltipContent: 'Table of contents',
    showInReadOnly: true,
  },
  {
    name: 'packages' as const,
    icon: PackageIcon,
    openWidthInPx: 480,
    contents: ({ readOnly, openDepsInstallModal }: SessionMenuPanelContentsProps) => (
      <SessionMenuPanelPackages readOnly={readOnly} openDepsInstallModal={openDepsInstallModal} />
    ),
    tooltipContent: 'package.json',
    showInReadOnly: true,
  },
  {
    name: 'settings' as const,
    icon: SettingsIcon,
    openWidthInPx: 480,
    contents: (props: SessionMenuPanelContentsProps) => <SessionMenuPanelSettings {...props} />,
    tooltipContent: 'Settings and configuration',
    showInReadOnly: true,
  },
  {
    name: 'secrets' as const,
    icon: KeySquareIcon,
    openWidthInPx: 480,
    contents: (props: SessionMenuPanelContentsProps) => (
      <SessionMenuPanelSecrets session={props.session} />
    ),
    showInReadOnly: false,
  },
];
export type Panel = (typeof SESSION_MENU_PANELS)[0];

type BaseProps = {
  session: SessionType;
  selectedPanelName: Panel['name'];
  selectedPanelOpen: boolean;
  onChangeSelectedPanelNameAndOpen: (
    old: (param: [Panel['name'], boolean]) => [Panel['name'], boolean],
  ) => void;
};

type Props =
  | (BaseProps & { readOnly: true })
  | (BaseProps & {
      readOnly?: false;
      openDepsInstallModal: () => void;
      channel: SessionChannel;
    });

marked.use({ gfm: true });

const SESSION_MENU_SHEET_PANEL_WIDTH_BREAKPOINT_PX = 1024;

type SessionMenuPanelProps = {
  open: boolean;
  openWidthPx: number;
  onClose: () => void;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
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
              className="overflow-y-auto p-0"
              style={{ width: props.openWidthPx }}
              portal={false}
            >
              <div className="flex grow shrink h-full">
                {props.sidebar ? (
                  <div className="grow-0 shrink-0 w-12 h-full">{props.sidebar}</div>
                ) : null}
                <div className="grow shrink p-6">{props.children}</div>
              </div>
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

type SidebarProps = {
  readOnly?: boolean;
  selectedPanelName: Panel['name'];
  selectedPanelOpen: boolean;
  onChangeSelectedPanelNameAndOpen: (
    old: (param: [Panel['name'], boolean]) => [Panel['name'], boolean],
  ) => void;
  onShowShortcutsModal: () => void;
  onShowFeedbackModal: () => void;
};

function Sidebar({
  readOnly,
  selectedPanelName,
  selectedPanelOpen,
  onChangeSelectedPanelNameAndOpen,
  onShowShortcutsModal,
  onShowFeedbackModal,
}: SidebarProps) {
  return (
    <div className="flex flex-col items-center justify-between w-12 h-full py-4">
      <div className="flex flex-col items-center w-full gap-2">
        {SESSION_MENU_PANELS.map((panel) => {
          if (readOnly && !panel.showInReadOnly) {
            return null;
          }

          const Icon = panel.icon;
          return (
            <TooltipProvider key={panel.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
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
                </TooltipTrigger>
                <TooltipContent side="right">{panel.tooltipContent}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
      <div className="flex flex-col items-center w-full gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="icon"
                size="icon"
                className="active:translate-y-0"
                onClick={onShowShortcutsModal}
              >
                <KeyboardIcon size={18} className="stroke-tertiary-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Keyboard shortcuts</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {!readOnly ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="icon"
                  size="icon"
                  className="active:translate-y-0"
                  onClick={onShowFeedbackModal}
                >
                  <MessageCircleIcon size={18} className="stroke-tertiary-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Leave feedback</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
    </div>
  );
}

export default function SessionMenu(props: Props) {
  const {
    readOnly,
    session,
    selectedPanelName,
    selectedPanelOpen,
    onChangeSelectedPanelNameAndOpen,
  } = props;
  const openDepsInstallModal = !readOnly ? props.openDepsInstallModal : null;
  const channel = !readOnly ? props.channel : null;

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const selectedPanel = useMemo(
    () => SESSION_MENU_PANELS.find((panel) => panel.name === selectedPanelName)!,
    [selectedPanelName],
  );

  // The key '?' is buggy, so we use 'Slash' with 'shift' modifier.
  // This assumes qwerty layout.
  useHotkeys('shift+Slash', () => setShowShortcuts(!showShortcuts));

  const selectedPanelContentsProps: SessionMenuPanelContentsProps = useMemo(
    () => ({
      readOnly: readOnly || false,
      session,
      channel,
      openDepsInstallModal,
    }),
    [readOnly, session, channel, openDepsInstallModal],
  );

  return (
    <>
      <KeyboardShortcutsDialog
        readOnly={readOnly}
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
      {!readOnly ? <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} /> : null}

      {/* The sidebar is of a certain defined pixel width whoose parent takes the space of the fixed position element: */}
      <div className="grow-0 shrink-0 w-12">
        <div className="fixed top-12 left-0 bottom-0 w-12">
          <Sidebar
            readOnly={readOnly}
            selectedPanelName={selectedPanelName}
            selectedPanelOpen={selectedPanelOpen}
            onChangeSelectedPanelNameAndOpen={onChangeSelectedPanelNameAndOpen}
            onShowShortcutsModal={() => setShowShortcuts(true)}
            onShowFeedbackModal={() => setShowFeedback(true)}
          />
        </div>
      </div>

      {/* The opened panel is of a certain defined pixel width whose parent takes the space of the fixed position element: */}
      <SessionMenuPanel
        open={selectedPanelOpen}
        openWidthPx={selectedPanel?.openWidthInPx ?? 0}
        onClose={() => onChangeSelectedPanelNameAndOpen(([name, _open]) => [name, false])}
        sidebar={
          <Sidebar
            readOnly={readOnly}
            selectedPanelName={selectedPanelName}
            selectedPanelOpen={selectedPanelOpen}
            onChangeSelectedPanelNameAndOpen={onChangeSelectedPanelNameAndOpen}
            onShowShortcutsModal={() => setShowShortcuts(true)}
            onShowFeedbackModal={() => setShowFeedback(true)}
          />
        }
      >
        {selectedPanel.contents(selectedPanelContentsProps)}
      </SessionMenuPanel>
    </>
  );
}
