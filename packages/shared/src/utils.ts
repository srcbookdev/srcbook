import { base58 } from '@scure/base';

export function randomid(byteSize = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteSize));
  return base58.encode(bytes);
}

export function validFilename(filename: string) {
  return /^[a-zA-Z0-9_-]+\.(mjs|json)$/.test(filename);
}
