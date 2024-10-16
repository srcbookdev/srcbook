// This file and client side code assumes posix paths. It is incomplete and handles basic
// functionality. That should be ok as we expect a subset of behavior and assume simple paths.

const ROOT_PATH = '.';

export function dirname(path: string): string {
  path = path.trim();

  if (path === '' || path === './' || path === ROOT_PATH) {
    return ROOT_PATH;
  }

  const parts = path.split('/');

  return parts
    .slice(0, parts.length - 1)
    .join('/')
    .trim();
}

export function basename() {
  return '';
}

export function extname(path: string) {
  const idx = path.lastIndexOf('.');
  return idx === -1 ? '' : path.slice(idx);
}
