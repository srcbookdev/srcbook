import fs from 'fs/promises';
import Path from 'path';
import { base58 } from '@scure/base';

export function randomid(byteSize = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteSize));
  return base58.encode(bytes);
}

export function take(obj, ...keys) {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    if (keys.includes(key)) {
      result[key] = value;
    }
  }

  return result;
}

export async function disk(path, includeHidden, ext) {
  const results = await fs.readdir(path, { withFileTypes: true });

  const entries = results
    .filter((entry) => {
      if (entry.name.startsWith('.') && !includeHidden) {
        return false;
      }

      return entry.isDirectory() || Path.extname(entry.name) === ext;
    })
    .map((entry) => {
      return {
        name: entry.name,
        path: Path.join(entry.parentPath, entry.name),
        parentPath: entry.parentPath,
        isDirectory: entry.isDirectory(),
      };
    })
    .sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) {
        return -1;
      } else if (!a.isDirectory && b.isDirectory) {
        return 1;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

  return isRootPath(path)
    ? entries
    : [
        {
          name: '..',
          path: Path.dirname(path),
          parentPath: Path.dirname(path),
          isDirectory: true,
        },
      ].concat(entries);
}

function isRootPath(path) {
  // Make sure to resolve the path, e.g., `/../` -> `/`
  const normalizedPath = Path.resolve(path);

  // On POSIX systems, the root is always "/"
  // On Windows, roots can be "C:\", "D:\", etc.
  if (process.platform === 'win32') {
    // For Windows, the root path ends with a backslash after the drive letter
    return /^[a-zA-Z]:\\$/.test(normalizedPath);
  } else {
    return normalizedPath === '/';
  }
}
