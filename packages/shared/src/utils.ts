import { base58 } from '@scure/base';
import { CodeLanguageType } from './types/cells';

export function randomid(byteSize = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteSize));
  return base58.encode(bytes);
}

export function validFilename(filename: string) {
  return /^[a-zA-Z0-9_-]+\.(js|cjs|mjs|ts|cts|mts)$/.test(filename);
}

export function isJavaScriptFile(filename: string) {
  return /\.(js|cjs|mjs)$/.test(filename);
}

export function isTypeScriptFile(filename: string) {
  return /\.(ts|cts|mts)$/.test(filename);
}

export function languageFromFilename(filename: string): CodeLanguageType {
  if (isJavaScriptFile(filename)) {
    return 'javascript';
  } else if (isTypeScriptFile(filename)) {
    return 'typescript';
  } else {
    throw new Error(
      `Language is not one of 'javascript' or 'typescript' based on filename '${filename}'`,
    );
  }
}

export function extensionsForLanguage(language: CodeLanguageType) {
  switch (language) {
    case 'javascript':
      return ['js', 'cjs', 'mjs'];
    case 'typescript':
      return ['ts', 'cts', 'mts'];
    default:
      throw new Error(`Unrecognized language ${language}`);
  }
}

export function getDefaultExtensionForLanguage(language: CodeLanguageType) {
  switch (language) {
    case 'javascript':
      return '.js';
    case 'typescript':
      return '.ts';
    default:
      throw new Error(`Unrecognized language ${language}`);
  }
}
