import type * as React from 'react';
import type { SessionType } from '../types';
import type { CellType, TitleCellType } from '@srcbook/shared';
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

export function getTitleForSession(session: SessionType) {
  const titleCell = session.cells.find((cell: CellType) => cell.type === 'title') as TitleCellType;
  return titleCell?.text;
}

export async function sendFeedback(feedback: string) {
  const url =
    'https://script.google.com/macros/s/AKfycbxbNh5sEvmvuaYZyuNYY6vULEX1vyhkHrqoyfuUMBz3PG5RcekCVcuC4-ceboefxgF0FA/exec';

  await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    mode: 'no-cors',
    body: JSON.stringify({ feedback }),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  });

  console.log('request sent');
}
