import type { server as tsserver } from 'typescript';
import type { TsServerDiagnosticType } from '@srcbook/shared';

/**
 * Parse messages from a chunk of data sent by tsserver.
 *
 * Notes:
 *
 * - A 'message' takes the form:  "Content-Length: <number>\r\n\r\n<json>".
 * - A single chunk may contain multiple messages.
 * - A single chunk of data may contain an incomplete message, or contain complete message(s) followed by an incomplete one.
 *
 * Example that contains only one message:
 *
 *     "Content-Length: 238\r\n\r\n{\"seq\":0,\"type\":\"event\",\"event\":\"projectLoadingStart\",\"body\":{\"projectName\":\"/Users/ben/.srcbook/tsconfig.json\",\"reason\":\"Creating possible configured project for /Users/ben/.srcbook/srcbooks/4bs7n0hg8n0163du5ik9shjdmc/main.ts to open\"}}\n"
 *
 * Example with multiple messages:
 *
 *     "Content-Length: 609\r\n\r\n{\"seq\":0,\"type\":\"event\",\"event\":\"telemetry\",\"body\":{\"telemetryEventName\":\"projectInfo\",\"payload\":{\"projectId\":\"ebdc8edc2317622018a25bdb7fd3ef5e41538960354c166d5577561381bed531\",\"fileStats\":{\"js\":0,\"jsSize\":0,\"jsx\":0,\"jsxSize\":0,\"ts\":5,\"tsSize\":2084,\"tsx\":0,\"tsxSize\":0,\"dts\":7,\"dtsSize\":1567085,\"deferred\":0,\"deferredSize\":0},\"compilerOptions\":{},\"typeAcquisition\":{\"enable\":false,\"include\":false,\"exclude\":false},\"extends\":false,\"files\":false,\"include\":false,\"exclude\":false,\"compileOnSave\":false,\"configFileName\":\"tsconfig.json\",\"projectType\":\"configured\",\"languageServiceEnabled\":true,\"version\":\"5.5.3\"}}}\nContent-Length: 435\r\n\r\n{\"seq\":0,\"type\":\"event\",\"event\":\"configFileDiag\",\"body\":{\"triggerFile\":\"/Users/ben/.srcbook/srcbooks/4bs7n0hg8n0163du5ik9shjdmc/main.ts\",\"configFile\":\"/Users/ben/.srcbook/tsconfig.json\",\"diagnostics\":[{\"start\":{\"line\":2,\"offset\":3},\"end\":{\"line\":2,\"offset\":11},\"text\":\"'module' should be set inside the 'compilerOptions' object of the config json file\",\"code\":6258,\"category\":\"error\",\"fileName\":\"/Users/ben/.srcbook/tsconfig.json\"}]}}\nContent-Length: 76\r\n\r\n{\"seq\":0,\"type\":\"event\",\"event\":\"typingsInstallerPid\",\"body\":{\"pid\":44901}}\n"
 *
 */
export function parseTsServerMessages(chunk: Buffer, buffered: Buffer) {
  const data = Buffer.concat([buffered, chunk]).toString('utf8');
  const dataLen = data.length;

  const matches = data.matchAll(/Content-Length: (\d+)\r\n\r\n/g);

  const messages: Array<tsserver.protocol.Event | tsserver.protocol.Response> = [];

  for (const match of matches) {
    // 'header' is everything that matched in the regexp, i.e.: "Content-Length: <number>\r\n\r\n"
    const header = match[0];

    // 'offset' is the index (in the string) of the first character of the match, i.e. 'C' in 'Content-Length: ...'
    const offset = match.index;

    // 'contentLength' is the <number> in "Content-Length: <number>\r\n\r\n"
    const contentLength = Number(match[1]);

    // 'start' is where the JSON message body starts
    const start = offset + header.length;

    // 'end' is where the JSON message body ends
    const end = start + contentLength;

    if (end > dataLen) {
      // If the chunk does not contain the entire message,
      // we buffer starting at the offset of the current match.
      return { messages, buffered: Buffer.from(data.slice(offset)) };
    }

    messages.push(JSON.parse(data.slice(start, end)));
  }

  return { messages, buffered: Buffer.from('') };
}

export function normalizeDiagnostic(
  diagnostic: tsserver.protocol.Diagnostic | tsserver.protocol.DiagnosticWithLinePosition,
): TsServerDiagnosticType {
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
