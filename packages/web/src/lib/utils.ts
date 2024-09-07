import type * as React from 'react';
import type { SessionType } from '../types';
import type { CellType, TitleCellType } from '@srcbook/shared';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getConfig, updateConfig } from './server';

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

export function getTitleForSession(session: SessionType) {
  const titleCell = session.cells.find((cell: CellType) => cell.type === 'title') as TitleCellType;
  return titleCell?.text;
}
