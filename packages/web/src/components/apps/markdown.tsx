import { marked } from 'marked';
import { cn } from '@/lib/utils';

export default function Markdown(props: { source: string; className?: string }) {
  return (
    <div
      className={cn('sb-prose-chat px-2', props.className)}
      dangerouslySetInnerHTML={{ __html: marked(props.source) }}
    />
  );
}
