import type { IncomingMessage } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import type { CorsOptions } from 'cors';

/**
 * Srcbook runs on the user's machine and has no authentication. That makes the
 * origin of a request the only thing distinguishing the user's own browser tab
 * from any other web page they happen to have open, because every page on the
 * internet can reach http://localhost.
 *
 * So: requests from a browser must come from a local origin. Requests with no
 * Origin header at all (curl, the CLI's own fetch, same-origin navigations) are
 * allowed — browsers always set Origin on cross-origin requests, so an absent
 * Origin cannot be an attacker's page.
 *
 * Note that CORS headers alone are not enough here. They stop an attacker from
 * *reading* a response, but the request still executes, which is all you need for
 * something like POST /api/settings. Disallowed origins are therefore rejected
 * outright rather than merely being denied a CORS header.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Additional origins the user explicitly trusts, as a comma-separated list.
 * Intended for setups that serve the frontend from somewhere other than
 * localhost, e.g. a reverse proxy or a remote dev box.
 */
function configuredOrigins(): string[] {
  return (process.env.SRCBOOK_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function isOriginAllowed(origin: string | undefined): boolean {
  // No Origin header. Not a cross-origin browser request, so there is nothing to check.
  if (origin === undefined || origin === '' || origin === 'null') {
    return true;
  }

  if (configuredOrigins().includes(origin)) {
    return true;
  }

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }

  return LOCAL_HOSTNAMES.has(url.hostname);
}

/**
 * Options for the `cors` middleware. Mirrors `isOriginAllowed` so preflight
 * responses agree with what `verifyOrigin` will actually permit.
 */
export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    callback(null, isOriginAllowed(origin));
  },
};

/**
 * Rejects requests from origins we don't trust.
 *
 * This is the part that stops cross-site request forgery: an attacker's page can
 * issue the request regardless of CORS, so the request has to fail, not just its
 * response be unreadable.
 */
export function verifyOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin');

  if (isOriginAllowed(origin)) {
    next();
    return;
  }

  console.warn(`Rejected ${req.method} ${req.path} from disallowed origin '${origin}'`);

  res.status(403).json({
    error: true,
    result: 'Request origin is not allowed. Srcbook only accepts requests from local origins.',
  });
}

/**
 * Origin check for the websocket upgrade.
 *
 * Websockets are not subject to the same-origin policy, so without this any page
 * can open a socket to the server and drive cell execution.
 */
export function verifyWebSocketOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;

  if (isOriginAllowed(origin)) {
    return true;
  }

  console.warn(`Rejected websocket connection from disallowed origin '${origin}'`);
  return false;
}

/**
 * Options for `new WebSocketServer(...)`.
 *
 * `verifyClient` runs before the handshake completes, so a rejected client never
 * gets an open socket. Checking in the 'connection' handler instead would be too
 * late — the handshake has already succeeded by then and the client observes a
 * connection that is only afterwards torn down.
 */
export const webSocketServerOptions = {
  verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    return verifyWebSocketOrigin(info.req);
  },
};

/**
 * The address the server binds to.
 *
 * Defaults to loopback. Binding every interface exposes an unauthenticated server
 * that can execute arbitrary code to the whole network, so that has to be a choice
 * the user makes deliberately rather than the default.
 */
export function bindHost(): string {
  const host = (process.env.HOST ?? '').trim();
  return host === '' ? '127.0.0.1' : host;
}
