import type { server as tsserver } from 'typescript';

const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();
const CONTENT_LENGTH_HEADER = ENCODER.encode('Content-Length: ');
const CARRIAGE_RETURN_CHAR_CODE = '\r'.charCodeAt(0);

/**
 * Parse messages from a chunk of data sent by tsserver.
 *
 * Notes:
 *
 * - A 'message' takes the form:  "Content-Length: <number>\r\n\r\n<json>".
 * - A single chunk may contain multiple messages.
 * - A single chunk of data may contain an incomplete message, or contain complete message(s) followed by an incomplete one.
 * - The "content length" number is the number of bytes, not characters. Unicode characters may be multiple bytes but only one string character. Thus, we must parse bytes not strings.
 */
export function parse(chunk: Buffer, buffered: Buffer) {
  let buffer = new Uint8Array(Buffer.concat([buffered, chunk]));

  const messages: Array<tsserver.protocol.Event | tsserver.protocol.Response> = [];

  while (true) {
    const content = getContentByteLength(buffer);

    if (content === null) {
      return { messages: messages, buffered: Buffer.from(buffer) };
    }

    const { start, byteLength } = content;

    const end = start + byteLength;

    if (end > buffer.byteLength) {
      return { messages: messages, buffered: Buffer.from(buffer) };
    }

    const message = DECODER.decode(buffer.slice(start, end));

    messages.push(JSON.parse(message));

    buffer = buffer.slice(end);

    if (buffer.byteLength === 0) {
      break;
    }
  }

  return { messages, buffered: Buffer.from(buffer) };
}

/**
 * Get the byte length and start index of the message content.
 *
 * If the buffer does not contain a complete Content-Length header, null is returned.
 *
 * If the buffer is an unexpected format (has data but not the Content-Length header),
 * an error is thrown.
 *
 * Example:
 *
 *     getContentByteLength("Content-Length: 3\r\n\r\n{}\n") // => { start: 21, byteLength: 3 }
 *
 */
function getContentByteLength(buffer: Uint8Array): { start: number; byteLength: number } | null {
  if (buffer.byteLength < CONTENT_LENGTH_HEADER.byteLength) {
    return null;
  }

  if (!startsWith(buffer, CONTENT_LENGTH_HEADER)) {
    throw new Error(
      `Expected buffer argument to start with '${DECODER.decode(CONTENT_LENGTH_HEADER)}'`,
    );
  }

  const start = CONTENT_LENGTH_HEADER.byteLength;

  let i = start;

  while (true) {
    if (i >= buffer.byteLength) {
      return null;
    }

    if (buffer[i] === CARRIAGE_RETURN_CHAR_CODE || buffer[i] === undefined) {
      break;
    }

    // If the character is not a number (codes 48-57), the data in the buffer is invalid.
    if ((buffer[i] as number) < 48 || (buffer[i] as number) > 57) {
      throw new Error(
        `Unexpected byte '${buffer[i]}' in Content-Length header. Expected a number between 0 and 9 (byte values 48-57).`,
      );
    }

    i++;
  }

  const byteLength = Number(DECODER.decode(buffer.slice(start, i)));

  // The message content starts after '\r\n\r\n'
  const contentStart = i + 4;

  if (buffer.byteLength < contentStart) {
    return null;
  }

  return { start: contentStart, byteLength: byteLength };
}

/**
 * Does one buffer start with another?
 *
 * Examples:
 *
 *     startsWith(Uint8Array(4) [1,2,3,4], Uint8Array (2) [1,2]) // => true
 *     startsWith(Uint8Array(4) [1,2,3,4], Uint8Array (2) [5,2]) // => false
 */
function startsWith(buffer: Uint8Array, prefix: Uint8Array) {
  const bufferLen = buffer.byteLength;
  const prefixLen = prefix.byteLength;

  if (prefixLen > bufferLen) {
    return false;
  }

  for (let i = 0; i < prefixLen; i++) {
    if (buffer[i] !== prefix[i]) {
      return false;
    }
  }

  return true;
}
