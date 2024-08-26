import * as React from 'react';

import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

const className =
  'flex w-full rounded-md border border-transparent bg-transparent px-1 py-1 transition-colors hover:border-input hover:shadow-sm focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export function EditableH1(props: {
  text: string;
  className?: string;
  onUpdated: (text: string) => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);
  const [heading, setHeading] = React.useState<string>(props.text);
  const [isMaxHeadingLengthExceeded, setIsMaxHeadingLengthExceeded] =
    React.useState<boolean>(false);
  const maxHeadingLength = 44;

  const handleChange = (newValue: string) => {
    if (newValue.length > maxHeadingLength) {
      setIsMaxHeadingLengthExceeded(true);
      setTimeout(() => {
        setIsMaxHeadingLengthExceeded(false);
      }, 2000);
      return;
    }
    setHeading(newValue);
  };

  return (
    <div>
      <textarea
        className={cn(className, props.className)}
        value={heading}
        onBlur={(e) => {
          const text = e.currentTarget.value;
          if (text !== props.text) {
            props.onUpdated(text);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && ref.current) {
            ref.current.blur();
          }
        }}
        onChange={(e) => {
          handleChange(e.target.value);
        }}
        ref={ref}
        rows={1}
      />
      {isMaxHeadingLengthExceeded && (
        <div className="bg-error text-error-foreground flex items-center rounded-sm border border-transparent px-[10px] py-2 text-sm leading-none font-medium">
          <Info size={14} className="mr-1.5" />
          Max heading length exceeded
        </div>
      )}
    </div>
  );
}
