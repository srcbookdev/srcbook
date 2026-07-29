import Path from 'node:path';

/**
 * Resolve `segments` against `root` and assert the result stays inside it.
 *
 * User-supplied path segments reach the filesystem from several directions —
 * srcbook ids in URLs, cell filenames decoded from a `.src.md`, file paths that
 * tsserver reports back to the client — and any of them can contain `..`. Express
 * URL-decodes route params, so `..%2F..%2F` arrives as a real traversal.
 *
 * Returns the resolved path, or null when it would escape.
 */
export function containedPath(root: string, ...segments: string[]): string | null {
  const resolvedRoot = Path.resolve(root);
  const resolved = Path.resolve(resolvedRoot, ...segments);

  if (resolved === resolvedRoot) {
    return resolved;
  }

  // The separator matters: without it, `/foo/barbaz` looks like it is inside `/foo/bar`.
  if (!resolved.startsWith(resolvedRoot + Path.sep)) {
    return null;
  }

  return resolved;
}

/**
 * Like `containedPath`, but throws instead of returning null.
 *
 * Use at trust boundaries where there is no sensible way to continue.
 */
export function requireContainedPath(root: string, ...segments: string[]): string {
  const path = containedPath(root, ...segments);

  if (path === null) {
    throw new Error(`Refusing to operate on a path outside of ${root}`);
  }

  return path;
}
