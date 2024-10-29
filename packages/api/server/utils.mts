import { ServerResponse } from 'node:http';
import { StreamToIterable } from '@srcbook/shared';

/**
 * Pipe a `ReadableStream` through a Node `ServerResponse` object.
 */
export async function streamJsonResponse(
  stream: ReadableStream,
  response: ServerResponse,
  options?: {
    headers?: Record<string, string>;
    status?: number;
  },
) {
  options ??= {};

  response.writeHead(options.status || 200, {
    ...options.headers,
    'Content-Type': 'text/plain',
    'Transfer-Encoding': 'chunked',
  });

  for await (const chunk of StreamToIterable(stream)) {
    response.write(chunk);
  }

  response.end();
}
