import { useState } from 'react';

import {
  ChevronsLeftIcon,
  FlagIcon,
  FolderTreeIcon,
  KeyboardIcon,
  SettingsIcon,
} from 'lucide-react';
import { Button } from '@srcbook/components/src/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@srcbook/components/src/components/ui/tooltip';
import KeyboardShortcutsDialog from '../keyboard-shortcuts-dialog';
import FeedbackDialog from '../feedback-dialog';
import { cn } from '@/lib/utils';
import ExplorerPanel from './panels/explorer';
import SettingsPanel from './panels/settings';
import { useFiles } from './use-files';
import { SrcbookLogo } from '../logos';
import { Link } from 'react-router-dom';

type PanelType = 'explorer' | 'settings';

function getTitleForPanel(panel: PanelType | null): string | null {
  switch (panel) {
    case 'explorer':
      return 'Files';
    case 'settings':
      return 'Settings';
    default:
      return null;
  }
}

export default function Sidebar() {
  const { openedFile } = useFiles();

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [panel, _setPanel] = useState<PanelType | null>(openedFile === null ? 'explorer' : null);

  function setPanel(nextPanel: PanelType) {
    _setPanel(nextPanel === panel ? null : nextPanel);
  }

  return (
    <>
      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} />

      <div className="flex h-full border-r border-border">
        <div className="flex flex-col items-center justify-between w-12 h-full py-3 bg-muted z-10">
          <div className="flex flex-col items-center w-full gap-2">
            <div className="flex items-start h-10">
              <Link to="/" className="p-0.5" title="Home">
                <SrcbookLogo size={20} />
              </Link>
            </div>
            <NavItemWithTooltip tooltipContent="Explorer" onClick={() => setPanel('explorer')}>
              <FolderTreeIcon
                size={18}
                className={cn(
                  'transition-colors',
                  panel === 'explorer'
                    ? 'text-secondary-foreground'
                    : 'text-tertiary-foreground hover:text-secondary-foreground',
                )}
              />
            </NavItemWithTooltip>
            <NavItemWithTooltip tooltipContent="Settings" onClick={() => setPanel('settings')}>
              <SettingsIcon
                size={18}
                className={cn(
                  'transition-colors',
                  panel === 'settings'
                    ? 'text-secondary-foreground'
                    : 'text-tertiary-foreground hover:text-secondary-foreground',
                )}
              />
            </NavItemWithTooltip>
          </div>
          <div className="flex flex-col items-center w-full gap-2">
            <NavItemWithTooltip
              tooltipContent="Keyboard shortcuts"
              onClick={() => setShowShortcuts(true)}
            >
              <KeyboardIcon
                size={18}
                className="text-tertiary-foreground hover:text-secondary-foreground transition-colors"
              />
            </NavItemWithTooltip>
            <NavItemWithTooltip
              tooltipContent="Leave feedback"
              onClick={() => setShowFeedback(true)}
            >
              <FlagIcon
                size={18}
                className="text-tertiary-foreground hover:text-secondary-foreground transition-colors"
              />
            </NavItemWithTooltip>
          </div>
        </div>
        <Panel
          open={panel !== null}
          title={getTitleForPanel(panel)}
          onClose={() => {
            if (panel !== null) {
              setPanel(panel);
            }
          }}
        >
          {panel === 'explorer' && <ExplorerPanel />}
          {panel === 'settings' && <SettingsPanel />}
        </Panel>
      </div>
    </>
  );
}

function NavItemWithTooltip(props: {
  children: React.ReactNode;
  tooltipContent: string;
  onClick: () => void;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="icon"
            size="icon"
            className="active:translate-y-0"
            onClick={props.onClick}
          >
            {props.children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{props.tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Panel(props: {
  open: boolean;
  title: string | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!props.open) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-muted animate-in slide-in-from-left duration-75">
      <div className="flex items-center justify-between h-12 px-3">
        <h4 className="font-semibold leading-none">{props.title}</h4>
        <button
          className="p-2 text-tertiary-foreground hover:text-foreground hover:bg-sb-core-110 rounded-sm"
          onClick={props.onClose}
        >
          <ChevronsLeftIcon size={18} />
        </button>
      </div>
      <div className="w-56 py-3 flex-1 overflow-auto">{props.children}</div>
    </div>
  );
}
