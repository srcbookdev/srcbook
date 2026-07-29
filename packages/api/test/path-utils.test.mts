import Path from 'node:path';
import { containedPath, requireContainedPath } from '../path-utils.mjs';

const ROOT = Path.resolve('/tmp/srcbooks');

describe('containedPath', () => {
  it('resolves segments inside the root', () => {
    expect(containedPath(ROOT, 'abc123')).toBe(Path.join(ROOT, 'abc123'));
    expect(containedPath(ROOT, 'abc123', 'src', 'foo.ts')).toBe(
      Path.join(ROOT, 'abc123', 'src', 'foo.ts'),
    );
  });

  it('rejects traversal out of the root', () => {
    // Express URL-decodes route params, so `..%2F..%2F` arrives here as real `../`.
    expect(containedPath(ROOT, '../../etc')).toBeNull();
    expect(containedPath(ROOT, '..')).toBeNull();
    expect(containedPath(ROOT, 'abc', '..', '..', 'etc')).toBeNull();
  });

  it('rejects absolute paths that escape the root', () => {
    expect(containedPath(ROOT, '/etc/passwd')).toBeNull();
    expect(containedPath(ROOT, Path.resolve('/tmp/other'))).toBeNull();
  });

  it('accepts absolute paths that are already inside the root', () => {
    const inside = Path.join(ROOT, 'abc123', 'src', 'foo.ts');
    expect(containedPath(ROOT, inside)).toBe(inside);
  });

  it('rejects a sibling directory sharing the root as a name prefix', () => {
    // The separator check matters here: '/tmp/srcbooks-evil' starts with
    // '/tmp/srcbooks' as a string but is not inside it.
    expect(containedPath(ROOT, '../srcbooks-evil/secrets')).toBeNull();
  });

  it('allows the root itself', () => {
    expect(containedPath(ROOT, '.')).toBe(ROOT);
  });

  it('normalises redundant segments rather than rejecting them', () => {
    expect(containedPath(ROOT, 'abc', '.', 'src')).toBe(Path.join(ROOT, 'abc', 'src'));
    expect(containedPath(ROOT, 'abc', 'nested', '..', 'src')).toBe(Path.join(ROOT, 'abc', 'src'));
  });
});

describe('requireContainedPath', () => {
  it('returns the path when contained', () => {
    expect(requireContainedPath(ROOT, 'abc123')).toBe(Path.join(ROOT, 'abc123'));
  });

  it('throws when it would escape', () => {
    expect(() => requireContainedPath(ROOT, '../../etc/passwd')).toThrow(/outside of/);
  });
});
