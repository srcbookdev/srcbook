import type { server as tsserver } from 'typescript';
import type { TsServerDiagnosticType } from '@srcbook/shared';

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
      // From what I can tell, code should always be present despite the type.
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
