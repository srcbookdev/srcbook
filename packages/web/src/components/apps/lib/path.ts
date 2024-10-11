// This file and client side code assumes posix paths. It is incomplete and handles basic
// functionality. That should be ok as we expect a subset of behavior and assume simple paths.

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

  return parts.pop() || '.';
}

export function extname(path: string) {
  const idx = path.lastIndexOf('.');
  return idx === -1 ? '' : path.slice(idx);
}
