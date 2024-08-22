import { parse } from '../tsserver/messages.mjs';

describe('parsing JSON RPC messages', () => {
  it('complete message', () => {
    const chunk = Buffer.from(
      'Content-Length: 76\r\n\r\n{"seq":0,"type":"event","event":"typingsInstallerPid","body":{"pid":58118}}\n',
    );

    const { messages, buffered } = parse(chunk, Buffer.from(''));

    expect(messages).toEqual([
      {
        seq: 0,
        type: 'event',
        event: 'typingsInstallerPid',
        body: { pid: 58118 },
      },
    ]);

    expect(buffered).toEqual(Buffer.from(''));
  });

  it('partial message', () => {
    const firstChunk = Buffer.from(
      'Content-Length: 76\r\n\r\n{"seq":0,"type":"event","event":"typingsInstallerPid","body":{"pid":58118}}\nContent-Length: 18\r\n\r\n{"js',
    );

    const secondChunk = Buffer.from('onrpc":"2.0"}\n');

    let result = parse(firstChunk, Buffer.from(''));

    expect(result.messages).toEqual([
      {
        seq: 0,
        type: 'event',
        event: 'typingsInstallerPid',
        body: { pid: 58118 },
      },
    ]);

    expect(result.buffered.toString('utf-8')).toEqual('Content-Length: 18\r\n\r\n{"js');

    result = parse(secondChunk, result.buffered);

    expect(result.messages).toEqual([{ jsonrpc: '2.0' }]);
    expect(result.buffered.toString('utf-8')).toEqual('');
  });

  it('message with unicode characters', () => {
    const chunk = Buffer.from(
      `Content-Length: 396\r\n\r\n{"seq":0,"type":"event","event":"semanticDiag","body":{"file":"/Users/ben/.srcbook/srcbooks/26c73ru4docv5bnve7e68ca6to/src/foo.ts","diagnostics":[{"start":{"line":1,"offset":1},"end":{"line":1,"offset":2},"text":"Cannot find name 'Ï'.","code":2304,"category":"error"},{"start":{"line":3,"offset":13},"end":{"line":3,"offset":14},"text":"Cannot find name 'x'.","code":2304,"category":"error"}]}}\nContent-Length: 152\r\n\r\n{"seq":0,"type":"event","event":"suggestionDiag","body":{"file":"/Users/ben/.srcbook/srcbooks/26c73ru4docv5bnve7e68ca6to/src/foo.ts","diagnostics":[]}}\n`,
    );

    const { messages, buffered } = parse(chunk, Buffer.from(''));

    expect(messages).toEqual([
      {
        seq: 0,
        type: 'event',
        event: 'semanticDiag',
        body: {
          file: '/Users/ben/.srcbook/srcbooks/26c73ru4docv5bnve7e68ca6to/src/foo.ts',
          diagnostics: [
            {
              start: { line: 1, offset: 1 },
              end: { line: 1, offset: 2 },
              text: "Cannot find name 'Ï'.",
              code: 2304,
              category: 'error',
            },
            {
              start: { line: 3, offset: 13 },
              end: { line: 3, offset: 14 },
              text: "Cannot find name 'x'.",
              code: 2304,
              category: 'error',
            },
          ],
        },
      },
      {
        body: {
          diagnostics: [],
          file: '/Users/ben/.srcbook/srcbooks/26c73ru4docv5bnve7e68ca6to/src/foo.ts',
        },
        event: 'suggestionDiag',
        seq: 0,
        type: 'event',
      },
    ]);

    expect(buffered).toEqual(Buffer.from(''));
  });
});
