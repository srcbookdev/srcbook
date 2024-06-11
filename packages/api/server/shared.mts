export function validFilename(filename: string) {
  return /^[a-zA-Z0-9_-]+\.(mjs|json)$/.test(filename);
}
