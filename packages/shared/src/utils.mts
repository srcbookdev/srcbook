import { base32hexnopad } from '@scure/base';
import type { CodeLanguageType } from './types/cells.mjs';
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

/**
 * Convert a ReadableStream<T> to an AsyncIterable<T>.
 *
 * ReadableStreams implement this natively in recent node versions. Unfortunately, older
 * node versions, most browsers, and the TypeScript type system do not support it yet.
 *
 * Example:
 *
 *     for await (const chunk of StreamToIterable(stream)) {
 *       // Do stuff with chunk
 *     }
 *
 * @param stream A ReadableStream.
 * @returns An AsyncIterable over the stream contents.
 */
export function StreamToIterable<T>(stream: ReadableStream<T>): AsyncIterable<T> {
  // @ts-ignore
  return stream[Symbol.asyncIterator] ? stream[Symbol.asyncIterator]() : createIterable(stream);
}

async function* createIterable<T>(stream: ReadableStream<T>): AsyncIterable<T> {
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        return;
      }

      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}
