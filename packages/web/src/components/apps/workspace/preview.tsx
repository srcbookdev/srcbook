import { cn } from '@/lib/utils';
import { usePreview } from '../use-preview';

type PropsType = {
  className?: string;
};

export function Preview(props: PropsType) {
  const { url } = usePreview();

  if (url === null) {
    return;
  }

  return (
    <div className={cn(props.className)}>
      <iframe className="w-full h-full" src={url} />
    </div>
  );
}
