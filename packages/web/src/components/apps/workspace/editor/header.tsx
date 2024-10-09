import { ShareIcon, PlayIcon, StopCircleIcon, EllipsisIcon } from 'lucide-react';
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

type PropsType = {
  app: AppType;
  className?: string;
};

export default function EditorHeader(props: PropsType) {
  const { start: startPreview, stop: stopPreview, status: previewStatus } = usePreview();

  function togglePreview() {
    if (previewStatus === 'running') {
      stopPreview();
    } else if (previewStatus === 'stopped') {
      startPreview();
    }
  }

  return (
    <>
      <header
        className={cn(
          'w-full flex items-center justify-between bg-background z-50 text-sm',
          props.className,
        )}
      >
        <nav className="flex items-center justify-between px-4 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="px-1.5">{props.app.name}</h3>
          </div>

          <div className="flex items-center gap-2">
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
            <Button
              onClick={togglePreview}
              variant="secondary"
              className="active:translate-y-0 gap-1.5"
              disabled={!(previewStatus === 'stopped' || previewStatus === 'running')}
            >
              {previewStatus === 'stopped' && <PlayIcon size={16} />}
              {previewStatus === 'running' && <StopCircleIcon size={16} />}
              Preview
            </Button>
          </div>
        </nav>
      </header>
    </>
  );
}
