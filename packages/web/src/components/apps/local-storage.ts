import { FileType } from '@srcbook/shared';

export function getLastOpenedFile(appId: string) {
  const value = window.localStorage.getItem(`apps:${appId}:last_opened_file`);

  if (typeof value === 'string') {
    return JSON.parse(value);
  }

  return null;
}

export function setLastOpenedFile(appId: string, file: FileType) {
  return window.localStorage.setItem(`apps:${appId}:last_opened_file`, JSON.stringify(file));
}
