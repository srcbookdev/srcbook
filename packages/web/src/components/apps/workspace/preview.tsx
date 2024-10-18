import { cn } from '@/lib/utils';
import { usePreview } from '../use-preview';
import { useEffect, useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { useLogs } from '../use-logs';
import { Button } from '@srcbook/components/src/components/ui/button';
import { usePackageJson } from '../use-package-json';

type PropsType = {
  isActive?: boolean;
  onShowPackagesPanel: () => void;
  className?: string;
};

export function Preview(props: PropsType) {
  const { url, status, start, lastStoppedError } = usePreview();
  const { status: npmInstallStatus, nodeModulesExists } = usePackageJson();
  const { togglePane } = useLogs();

  const isActive = props.isActive ?? true;

  const [startAttempted, setStartAttempted] = useState(false);
  useEffect(() => {
    if (isActive && status === 'stopped' && !startAttempted) {
      setStartAttempted(true);
      start();
    } else if (!isActive) {
      setStartAttempted(false);
    }
  }, [isActive, status, start, startAttempted]);

  if (nodeModulesExists === false) {
    switch (npmInstallStatus) {
      case "idle":
      case "complete":
        break;
      case "installing":
        return (
          <div className={cn('flex justify-center items-center w-full h-full', props.className)}>
            <div className="flex flex-col gap-6 items-center border border-border p-8 border-dashed rounded-md">
              <span>Dependencies installing...</span>
              <Button variant="secondary" onClick={props.onShowPackagesPanel}>
                View logs
              </Button>
            </div>
          </div>
        );
      case "failed":
        return (
          <div className={cn('flex justify-center items-center w-full h-full', props.className)}>
            <div className="flex flex-col gap-6 items-center border border-border p-8 border-dashed rounded-md">
              <span className="text-red-400">Dependencies installation failed</span>
              <Button variant="secondary" onClick={togglePane}>
                Open errors pane
              </Button>
            </div>
          </div>
        );
    }
  }

  switch (status) {
    case 'connecting':
    case 'booting':
      return (
        <div className={cn('flex justify-center items-center w-full h-full', props.className)}>
          <Loader2Icon size={18} className="animate-spin" />
        </div>
      );
    case 'running':
      if (url === null) {
        return;
      }

      return (
        <div className={cn('w-full h-full', props.className)}>
          <iframe className="w-full h-full" src={url} title="App preview" />
        </div>
      );
    case 'stopped':
      return (
        <div className={cn('flex justify-center items-center w-full h-full', props.className)}>
          {lastStoppedError === null ? (
            <span className="text-tertiary-foreground">Stopped preview server.</span>
          ) : (
            <div className="flex flex-col gap-6 items-center border border-border p-8 border-dashed rounded-md">
              <span className="text-red-400">Preview server stopped with an error!</span>
              <Button variant="secondary" onClick={togglePane}>
                Open errors pane
              </Button>
            </div>
          )}
        </div>
      );
  }
}
