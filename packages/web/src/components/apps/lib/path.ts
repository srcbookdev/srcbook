// This file and client side code assumes posix paths. It is incomplete and handles basic
// functionality. That should be ok as we expect a subset of behavior and assume simple paths.

export function extname(path: string) {
  const idx = path.lastIndexOf('.');
  return idx === -1 ? '' : path.slice(idx);
}
