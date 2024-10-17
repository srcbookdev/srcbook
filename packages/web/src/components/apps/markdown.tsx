import MarkdownReact from 'marked-react';
import { cn } from '@srcbook/components';

export default function Markdown(props: { source: string; className?: string }) {
  return (
    <div className={cn('sb-prose', props.className)}>
      <MarkdownReact gfm>{props.source}</MarkdownReact>
    </div>
  );
}
