import { cn } from '@/lib/utils';
import { usePreview } from '../use-preview';
import { useEffect } from 'react';
import { Loader2Icon } from 'lucide-react';
import { useLogs } from '../use-logs';

type PropsType = {
  isActive?: boolean;
  className?: string;
};

export function Preview(props: PropsType) {
  const { url, status, start } = usePreview();
  const { addError } = useLogs();

  const isActive = props.isActive ?? true;

  useEffect(() => {
    if (isActive && status === 'stopped') {
      start();
    }
  }, [isActive]);

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
          <div className="absolute">
            <button onClick={() => addError("Example error!")}>Trigger</button>
          </div>
          <iframe className="w-full h-full" src={url} title="App preview" />
        </div>
      );
    case 'stopped':
      return (
        <div className={cn('flex justify-center items-center w-full h-full', props.className)}>
          <span className="text-tertiary-foreground">Stopped</span>
        </div>
      );
  }
}
