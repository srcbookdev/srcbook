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

/**
 * Retrieves the subscribed email status from localStorage.
 * @returns An object with the email and a dismissed flag.
 */
export function getSubscribedEmailStatus(): { email: string | null; dismissed: boolean } {
  const storedValue = localStorage.getItem('sb:mailing-list-email');
  if (storedValue === null) {
    return { email: null, dismissed: false };
  }
  if (storedValue === 'dismissed') {
    return { email: null, dismissed: true };
  }
  return { email: storedValue, dismissed: false };
}

/**
 * Sets the subscribed email status in localStorage.
 * @param email The email to store. Pass null to remove the stored email.
 * @param dismissed Whether the user has dismissed the subscription popup.
 */
export function setSubscribedEmailStatus(email: string | null, dismissed: boolean = false): void {
  if (email === null && dismissed) {
    localStorage.setItem('sb:mailing-list-email', 'dismissed');
  } else if (email === null) {
    localStorage.removeItem('sb:mailing-list-email');
  } else {
    localStorage.setItem('sb:mailing-list-email', email);
  }
}
