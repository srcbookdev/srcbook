import { base32hexnopad } from '@scure/base';
import type { CodeEnvironmentType, CodeLanguageType } from './types/cells.mjs';
import * as crypto from 'crypto';

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function randomid(byteSize = 16) {
  const bytes = isBrowser()
    ? globalThis.crypto.getRandomValues(new Uint8Array(byteSize))
    : crypto.getRandomValues(new Uint8Array(byteSize));
  return base32hexnopad.encode(bytes).toLowerCase();
}

export function validFilename(filename: string) {
  return /^[a-zA-Z0-9_-]+\.(js|cjs|mjs|jsx|ts|cts|mts|tsx)$/.test(filename);
}

export function isJavaScriptFile(filename: string) {
  return /\.(js|cjs|mjs|jsx)$/.test(filename);
}

export function isTypeScriptFile(filename: string) {
  return /\.(ts|cts|mts|tsx)$/.test(filename);
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

export function extensionsForLanguage(
  language: CodeLanguageType,
  environment?: CodeEnvironmentType,
) {
  switch (language) {
    case 'javascript':
      const jsExts = ['js', 'cjs', 'mjs'];
      return environment === 'react' ? jsExts.concat('jsx') : jsExts;
    case 'typescript':
      const tsExts = ['ts', 'cts', 'mts'];
      return environment === 'react' ? tsExts.concat('tsx') : tsExts;
    default:
      throw new Error(`Unrecognized language ${language}`);
  }
}

export function getDefaultExtensionForLanguage(
  language: CodeLanguageType,
  environment?: CodeEnvironmentType,
) {
  switch (language) {
    case 'javascript':
      return environment === 'react' ? '.jsx' : '.js';
    case 'typescript':
      return environment === 'react' ? '.tsx' : '.ts';
    default:
      throw new Error(`Unrecognized language ${language}`);
  }
}
