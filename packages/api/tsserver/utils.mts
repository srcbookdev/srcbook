import type { server as tsserver } from 'typescript';
import type { DiagnosticType } from './types.mjs';

/**
 * Parse messages from a chunk of data sent by tsserver.
 *
 * A 'message' takes the form:  "Content-Length: <number>\r\n\r\n<json>". There can be multiple messages in a single chunk of data.
 *
 * TODO: Ensure that the chunk is a complete message. If it's not, we should buffer the data until we have a complete message.
 *
 * Examples:
 *
 *     Example that contains only one message:
 *
 *     "Content-Length: 238\r\n\r\n{\"seq\":0,\"type\":\"event\",\"event\":\"projectLoadingStart\",\"body\":{\"projectName\":\"/Users/ben/.srcbook/tsconfig.json\",\"reason\":\"Creating possible configured project for /Users/ben/.srcbook/srcbooks/4bs7n0hg8n0163du5ik9shjdmc/main.ts to open\"}}\n"
 *
 *
 *     Example with multiple messages:
 *
 *     "Content-Length: 609\r\n\r\n{\"seq\":0,\"type\":\"event\",\"event\":\"telemetry\",\"body\":{\"telemetryEventName\":\"projectInfo\",\"payload\":{\"projectId\":\"ebdc8edc2317622018a25bdb7fd3ef5e41538960354c166d5577561381bed531\",\"fileStats\":{\"js\":0,\"jsSize\":0,\"jsx\":0,\"jsxSize\":0,\"ts\":5,\"tsSize\":2084,\"tsx\":0,\"tsxSize\":0,\"dts\":7,\"dtsSize\":1567085,\"deferred\":0,\"deferredSize\":0},\"compilerOptions\":{},\"typeAcquisition\":{\"enable\":false,\"include\":false,\"exclude\":false},\"extends\":false,\"files\":false,\"include\":false,\"exclude\":false,\"compileOnSave\":false,\"configFileName\":\"tsconfig.json\",\"projectType\":\"configured\",\"languageServiceEnabled\":true,\"version\":\"5.5.3\"}}}\nContent-Length: 435\r\n\r\n{\"seq\":0,\"type\":\"event\",\"event\":\"configFileDiag\",\"body\":{\"triggerFile\":\"/Users/ben/.srcbook/srcbooks/4bs7n0hg8n0163du5ik9shjdmc/main.ts\",\"configFile\":\"/Users/ben/.srcbook/tsconfig.json\",\"diagnostics\":[{\"start\":{\"line\":2,\"offset\":3},\"end\":{\"line\":2,\"offset\":11},\"text\":\"'module' should be set inside the 'compilerOptions' object of the config json file\",\"code\":6258,\"category\":\"error\",\"fileName\":\"/Users/ben/.srcbook/tsconfig.json\"}]}}\nContent-Length: 76\r\n\r\n{\"seq\":0,\"type\":\"event\",\"event\":\"typingsInstallerPid\",\"body\":{\"pid\":44901}}\n"
 *
 */
export function parseTsServerMessages(
  chunk: Buffer,
): Array<tsserver.protocol.Event | tsserver.protocol.Response> {
  const data = chunk.toString('utf8');

  const matches = data.matchAll(/Content-Length: (\d+)\r\n\r\n/g);

  const messages = [];

  for (const match of matches) {
    // 'header' is everything that matched in the regexp, i.e.: "Content-Length: <number>\r\n\r\n"
    const header = match[0];

    // 'offset' is the index (in the string) of the first character of the match, i.e. 'C' in 'Content-Length: ...'
    const offset = match.index;

    // 'start' is where the JSON message body starts
    const start = offset + header.length;

    // 'contentLength' is the <number> in "Content-Length: <number>\r\n\r\n"
    const contentLength = Number(match[1]);

    const message = JSON.parse(data.slice(start, start + contentLength));

    messages.push(message);
  }

  return messages;
}

/**
 * Format a diagnostic message for user-facing output.
 *
 * Note: Filename is not included at the moment because these are intended to be rendered
 * under the cell of the file so context is already provided.
 *
 * TODO: This should be a responsibility of the client, not the server.
 *
 * Example:
 *
 *     [Ln 1, Col 7] error ts(2322): Type 'string' is not assignable to type 'number'.
 */
export function formatDiagnostic(
  diagnostic: tsserver.protocol.Diagnostic | tsserver.protocol.DiagnosticWithLinePosition,
) {
  const diag = normalizeDiagnostic(diagnostic);
  return `[Ln ${diag.start.line}, Col ${diag.start.offset}] ${diag.category} ts(${diag.code}): ${diag.text}`;
}

export function normalizeDiagnostic(
  diagnostic: tsserver.protocol.Diagnostic | tsserver.protocol.DiagnosticWithLinePosition,
): DiagnosticType {
  if (isDiagnosticWithLinePosition(diagnostic)) {
    return {
      code: diagnostic.code,
      category: diagnostic.category,
      text: diagnostic.message,
      start: diagnostic.startLocation,
      end: diagnostic.endLocation,
    };
  } else {
    return {
      // From what I can tell, code should always be present depsite the type.
      // If it's not, we use 1000 as the 'unknown' error code, which is not a
      // code defined in diagnosticMessages.json in TypeScript's source.
      code: diagnostic.code || 1000,
      category: diagnostic.category,
      text: diagnostic.text,
      start: diagnostic.start,
      end: diagnostic.end,
    };
  }
}

// No elegant implementation for this.
function isDiagnosticWithLinePosition(
  diagnostic: tsserver.protocol.Diagnostic | tsserver.protocol.DiagnosticWithLinePosition,
): diagnostic is tsserver.protocol.DiagnosticWithLinePosition {
  return 'startLocation' in diagnostic;
}
