import MarkdownReact from 'marked-react';
import { cn } from '@srcbook/components';

export default function Markdown(props: { source: string; className?: string }) {
  return (
    <div className={cn('sb-prose-chat px-2', props.className)}>
      <MarkdownReact gfm>{props.source}</MarkdownReact>
    </div>
  );
}
