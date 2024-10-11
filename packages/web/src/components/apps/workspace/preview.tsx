import { cn } from '@/lib/utils';
import { usePreview } from '../use-preview';

type PropsType = {
  className?: string;
};

export function Preview(props: PropsType) {
  const { url, status } = usePreview();

  switch (status) {
    case "booting":
    case "connecting":
      return (
        <div className={cn("flex justify-center items-center w-full h-full", props.className)}>
          <span className="text-tertiary-foreground">Booting...</span>
        </div>
      );
    case "running":
      if (url === null) {
        return;
      }

      return (
        <div className={cn(props.className)}>
          <iframe className="w-full h-full" src={url} title="App preview" />
        </div>
      );
    case "stopped":
      return null;
  }
}
