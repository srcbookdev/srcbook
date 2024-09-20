// import { SessionChannel } from '@/clients/websocket';
// import { CompletionContext } from '@codemirror/autocomplete';
// import { CodeCellType } from '@srcbook/shared';

// export function myCompletions(
//   context: CompletionContext,
//   sessionId: string,
//   cell: CodeCellType,
//   channel: SessionChannel,
// ) {
//   const word = context.matchBefore(/\w*/);
//   if (word?.from == word?.to && !context.explicit) return null;
//   return {
//     from: word?.from,
//     options: [
//       { label: 'match', type: 'keyword' },
//       { label: 'hello', type: 'variable', info: '(World)' },
//       { label: 'magic', type: 'text', apply: '⠁⭒*.✩.*⭒⠁', detail: 'macro' },
//     ],
//   };
// }

import { SessionChannel } from '@/clients/websocket';
import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { CodeCellType, TsServerCompletionEntriesPayloadType } from '@srcbook/shared';
import { mapCMLocationToTsServer } from './util';

export function myCompletions(
  context: CompletionContext,
  sessionId: string,
  cell: CodeCellType,
  channel: SessionChannel,
): Promise<CompletionResult | null> {
  return new Promise((resolve) => {
    if (cell.language !== 'typescript') {
      resolve(null);
      return;
    }

    const word = context.matchBefore(/\w*/);
    if (word?.from == word?.to && !context.explicit) {
      resolve(null);
      return;
    }

    const pos = context.pos;

    function callback({ response }: TsServerCompletionEntriesPayloadType) {
      channel.off('tsserver:cell:completions:response', callback);
      if (response === null) {
        return;
      }
      const options = response.entries.map((entry) => ({
        label: entry.name,
        type: entry.kind,
        info: entry.kindModifiers,
      }));

      resolve({
        from: word?.from ?? pos,
        options: options,
      });
    }

    channel.on('tsserver:cell:completions:response', callback);

    channel.push('tsserver:cell:completions:request', {
      sessionId: sessionId,
      cellId: cell.id,
      request: {
        location: mapCMLocationToTsServer(cell.source, pos),
      },
    });
  });
}
