import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function CollapsibleContainer(props: {
  open: boolean;
  onChangeOpen: (value: boolean) => void;
  title: string;
  className?: string | null;
  children: React.ReactNode;
}) {
  const { open, onChangeOpen, title, children } = props;

  return (
    <Collapsible open={open} onOpenChange={onChangeOpen}>
      <div className={cn('w-full border rounded-sm', props.className)}>
        <CollapsibleTrigger className="block w-full">
          <div className="p-3 flex items-center justify-between">
            <h5 className="font-bold leading-none">{title}</h5>
            <ChevronRight
              className={cn('w-4 h-4 transition-transform text-tertiary-foreground', {
                'transform rotate-90': open,
              })}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>{children}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}
