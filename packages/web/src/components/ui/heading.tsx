import * as React from 'react';

import { cn } from '@/lib/utils';

const className =
  'flex w-full rounded-md border border-transparent bg-transparent px-1 py-1 transition-colors hover:border-input hover:shadow-sm focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export function EditableH1(props: {
  text: string;
  className?: string;
  onUpdated: (text: string) => void;
}) {
  const ref = React.useRef<HTMLHeadingElement | null>(null);

  return (
    <h1
      className={cn(className, props.className)}
      ref={ref}
      contentEditable
      suppressContentEditableWarning={true}
      onBlur={(e) => {
        const text = e.currentTarget.innerHTML;
        if (text !== props.text) {
          props.onUpdated(text);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && ref.current) {
          ref.current.blur();
        }
      }}
    >
      {props.text}
    </h1>
  );
}
