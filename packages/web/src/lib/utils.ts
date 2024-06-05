import type * as React from 'react';
import { type ClassValue, clsx } from 'clsx';
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

export function splitPath(fullPath: string) {
  // Find the last slash in the path. Assumes macOSX or Linux-style paths
  // For this, first we normalize the path to use forward slashes
  const normalizedPath = fullPath.replace(/\\/g, '/');

  const lastSlashIndex = normalizedPath.lastIndexOf('/');

  // If there's no slash, the fullPath is just the basename
  if (lastSlashIndex === -1) {
    return {
      dirname: '',
      basename: fullPath,
    };
  }

  // Split the path into dirname and basename
  const dirname = fullPath.substring(0, lastSlashIndex);
  const basename = fullPath.substring(lastSlashIndex + 1);

  return { dirname, basename };
}
