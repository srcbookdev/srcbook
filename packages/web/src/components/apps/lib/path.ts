// This file and client side code assumes posix paths. It is incomplete and handles
// basic functionality. That should be ok as we expect a subset of behavior and assume
// simple paths that we control.

const ROOT_PATH = '.';

export function dirname(path: string): string {
  path = path.trim();

  if (path === '' || path === ROOT_PATH) {
    return ROOT_PATH;
  }

  const parts = path.split('/');

  if (parts.length === 1) {
    return '.';
  }

  return parts.slice(0, parts.length - 1).join('/');
}

export function extname(path: string) {
  const idx = path.lastIndexOf('.');
  return idx === -1 ? '' : path.slice(idx);
}

export function join(...paths: string[]) {
  return paths
    .join('/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .replace(/^\./, '')
    .replace(/^\//, '');
}

export function basename(path: string) {
  if (path === ROOT_PATH) {
    return ROOT_PATH;
  }

  const parts = path.split('/');

  return parts[parts.length - 1];
}
