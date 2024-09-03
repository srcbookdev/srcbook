import { useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { TitleCellUpdateAttrsSchema } from '@srcbook/shared';

const className =
  'flex w-full break-all whitespace-normal rounded-md border border-transparent bg-transparent px-1 py-1 transition-colors hover:border-input hover:shadow-sm focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

function isCharacterKey(e: React.KeyboardEvent<HTMLHeadingElement>) {
  return (
    e.key.length === 1 && // This checks if the pressed key is a single character
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey
  );
}

export function EditableH1(props: {
  text: string;
  className?: string;
  onUpdated: (text: string) => void;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const [error, _setError] = useState<string | null>(null);

  function clearError() {
    _setError(null);
    timeoutRef.current && clearTimeout(timeoutRef.current);
  }

  function setError(error: string) {
    timeoutRef.current && clearTimeout(timeoutRef.current);
    _setError(error);
    timeoutRef.current = setTimeout(() => {
      _setError(null);
    }, 3000) as unknown as number;
  }

  return (
    <div>
      <h1
        className={cn(className, props.className)}
        ref={ref}
        contentEditable
        suppressContentEditableWarning={true}
        onBlur={(e) => {
          const result = TitleCellUpdateAttrsSchema.safeParse({ text: e.currentTarget.innerHTML });

          if (result.success) {
            props.onUpdated(result.data.text);
          } else {
            setError(result.error.errors[0]?.message ?? 'Unknown error');
            if (ref.current) {
              ref.current.innerText = props.text;
            }
          }
        }}
        onKeyDown={(e) => {
          if (!ref.current) {
            return;
          }

          if (isCharacterKey(e)) {
            const result = TitleCellUpdateAttrsSchema.safeParse({
              text: ref.current.innerText + e.key,
            });
            if (result.error) {
              setError(result.error.errors[0]?.message ?? 'Unknown error');
              e.preventDefault();
              return false;
            }
          }

          clearError();

          if (e.key === 'Enter') {
            ref.current.blur();
          } else if (e.key === 'Escape') {
            ref.current.innerText = props.text;
            ref.current.blur();
          }
        }}
      >
        {props.text}
      </h1>
      {error && <span className="text-error pt-3 text-sm font-medium">{error}</span>}
    </div>
  );
}
