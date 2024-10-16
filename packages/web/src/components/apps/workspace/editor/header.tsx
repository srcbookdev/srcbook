import {
  ShareIcon,
  PlayIcon,
  StopCircleIcon,
  EllipsisIcon,
  CodeIcon,
  PlayCircleIcon,
} from 'lucide-react';
import type { AppType } from '@srcbook/shared';

import { Button } from '@srcbook/components/src/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@srcbook/components/src/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePreview } from '../../use-preview';
import { HeaderTab } from '../../use-header-tab';

type PropsType = {
  app: AppType;
  className?: string;
  tab: HeaderTab;
  onChangeTab: (newTab: HeaderTab) => void;
};

export default function EditorHeader(props: PropsType) {
  const { start: startPreview, stop: stopPreview, status: previewStatus } = usePreview();

  return (
    <>
      <header
        className={cn(
          'w-full flex items-center justify-between bg-background z-50 text-sm border-b border-b-border relative',
          props.className,
        )}
      >
        <nav className="flex items-center justify-between px-2 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="px-2 text-sm font-medium">{props.app.name}</h4>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 flex bg-inline-code h-7 rounded-md">
            <button
              className={cn(
                'flex gap-2 justify-center items-center w-24 text-foreground rounded-l-sm',
                {
                  'bg-foreground text-background rounded-md border border-border':
                    props.tab === 'code',
                },
              )}
              onClick={() => props.onChangeTab('code')}
            >
              <CodeIcon size={14} />
              Code
            </button>
            <button
              className={cn(
                'flex gap-2 justify-center items-center w-24 text-foreground rounded-l-sm',
                {
                  'bg-foreground text-background rounded-md border border-border':
                    props.tab === 'preview',
                },
              )}
              onClick={() => props.onChangeTab('preview')}
            >
              <PlayIcon size={14} />
              Preview
            </button>
          </div>

          <div className="flex items-center gap-2">
            {props.tab === 'preview' && previewStatus === 'stopped' ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="icon"
                      size="icon"
                      onClick={startPreview}
                      className="active:translate-y-0"
                    >
                      <PlayCircleIcon size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Start dev server</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            {props.tab === 'preview' && previewStatus !== 'stopped' ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="icon"
                      size="icon"
                      onClick={stopPreview}
                      className="active:translate-y-0"
                      disabled={previewStatus === 'booting' || previewStatus === 'connecting'}
                    >
                      <StopCircleIcon size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Stop dev server</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}

            <div
              className={cn('w-[1px] h-6 bg-border mx-2', { invisible: props.tab !== 'preview' })}
            />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="icon"
                    size="icon"
                    onClick={() => alert('Export')}
                    className="active:translate-y-0"
                  >
                    <ShareIcon size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export app</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="icon"
                    size="icon"
                    onClick={() => alert('More options')}
                    className="active:translate-y-0"
                  >
                    <EllipsisIcon size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>More options</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </nav>
      </header>
    </>
  );
}
