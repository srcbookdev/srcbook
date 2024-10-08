import { useState } from 'react';

import { BotMessageSquare, FilesIcon, FlagIcon, KeyboardIcon } from 'lucide-react';
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
import AIPanel from './panels/ai';
import { useFiles } from './use-files';

type PanelType = 'explorer' | 'ai';

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
        <div className="flex flex-col items-center justify-between w-12 h-full py-4 bg-background z-10">
          <div className="flex flex-col items-center w-full gap-2">
            <NavItemWithTooltip tooltipContent="Explorer" onClick={() => setPanel('explorer')}>
              <FilesIcon
                size={18}
                className={cn(
                  panel === 'explorer'
                    ? 'stroke-secondary-foreground'
                    : 'stroke-tertiary-foreground',
                )}
              />
            </NavItemWithTooltip>
            <NavItemWithTooltip tooltipContent="AI copilot" onClick={() => setPanel('ai')}>
              <BotMessageSquare
                size={18}
                className={cn(
                  panel === 'ai' ? 'stroke-secondary-foreground' : 'stroke-tertiary-foreground',
                )}
              />
            </NavItemWithTooltip>
          </div>
          <div className="flex flex-col items-center w-full gap-2">
            <NavItemWithTooltip
              tooltipContent="Keyboard shortcuts"
              onClick={() => setShowShortcuts(true)}
            >
              <KeyboardIcon size={18} className="stroke-tertiary-foreground" />
            </NavItemWithTooltip>
            <NavItemWithTooltip
              tooltipContent="Leave feedback"
              onClick={() => setShowFeedback(true)}
            >
              <FlagIcon size={18} className="stroke-tertiary-foreground" />
            </NavItemWithTooltip>
          </div>
        </div>
        <Panel open={panel !== null}>
          {panel === 'explorer' && <ExplorerPanel />}
          {panel === 'ai' && <AIPanel />}
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

function Panel(props: { open: boolean; children: React.ReactNode }) {
  if (!props.open) {
    return null;
  }

  return (
    <div className="h-full bg-background animate-in slide-in-from-left duration-75">
      {props.children}
    </div>
  );
}
