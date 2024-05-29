import type * as React from 'react';
import { type ClassValue, clsx } from 'clsx';
import { base58 } from '@scure/base';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Taken from https://github.com/gregberge/react-merge-refs/blob/main/src/index.tsx
export function mergeRefs<T>(
  refs: Array<React.MutableRefObject<T> | React.LegacyRef<T> | undefined | null>,
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

export function randomid(byteSize = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteSize));
  return base58.encode(bytes);
}
