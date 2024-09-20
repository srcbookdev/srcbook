import { cn } from '@/lib/utils';

type PropsType = {
  url: string;
  className?: string;
};

export function Preview(props: PropsType) {
  return (
    <div className={cn(props.className)}>
      <iframe className="w-full h-full" src={props.url} />
    </div>
  );
}
