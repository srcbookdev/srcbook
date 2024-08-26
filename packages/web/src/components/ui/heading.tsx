import * as React from 'react';

import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import { z } from 'zod';

const className =
  'flex w-full break-all whitespace-normal rounded-md border border-transparent bg-transparent px-1 py-1 transition-colors hover:border-input hover:shadow-sm focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export function EditableH1(props: {
  text: string;
  className?: string;
  onUpdated: (text: string) => void;
}) {
  const ref = React.useRef<HTMLHeadingElement>(null);
  const [isMaxHeadingLengthExceeded, setIsMaxHeadingLengthExceeded] =
    React.useState<boolean>(false);

  const maxHeadingLength = 44;
  const headingSchema = z.string().max(maxHeadingLength, {
    message: `Heading must be at most ${maxHeadingLength} characters long.`,
  });

  const handleChange = (newValue: string) => {
    const result = headingSchema.safeParse(newValue);
    if (!result.success) {
      setIsMaxHeadingLengthExceeded(true);
      if (ref.current) {
        // Ensure text is saved when contenteditable becomes false  by triggering blur event
        ref.current.blur();
      }
      setTimeout(() => {
        setIsMaxHeadingLengthExceeded(false);
      }, 2000);
      return;
    }
  };

  return (
    <div>
      <h1
        className={cn(className, props.className)}
        ref={ref}
        contentEditable={!isMaxHeadingLengthExceeded}
        suppressContentEditableWarning={true}
        onBlur={(e) => {
          e.currentTarget.innerHTML = e.currentTarget.innerHTML.slice(0, maxHeadingLength);
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
        onInput={(e) => {
          handleChange(e.currentTarget.innerText);
        }}
      >
        {props.text}
      </h1>
      {isMaxHeadingLengthExceeded && (
        <div className="bg-error text-error-foreground flex items-center rounded-sm border border-transparent px-[10px] py-2 text-sm leading-none font-medium">
          <Info size={14} className="mr-1.5" />
          Max heading length exceeded
        </div>
      )}
    </div>
  );
}
