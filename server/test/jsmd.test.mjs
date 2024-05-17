import { getRelativeFileContents } from './utils';
import { decode, encode } from '../jsmd.mjs';

describe('encoding and decoding jsmd files', () => {
  let mdFun;
  let onlyMarkdown;
  let mdAndCode;

  beforeAll(async () => {
    mdFun = await getRelativeFileContents('jsmd_files/md-fun.jsmd');
    onlyMarkdown = await getRelativeFileContents('jsmd_files/only-markdown.jsmd');
    mdAndCode = await getRelativeFileContents('jsmd_files/md-and-code.jsmd');
  });

  it('can decode a file properly', async () => {
    const cells = decode(mdFun);
    expect(cells).toHaveLength(3);
    expect(cells[0].type).toBe('title');
    expect(cells[0].text).toBe('md-fun');
  });

  it('can decode and re-encode a simple file', async () => {
    const final = encode(decode(mdFun));
    expect(final).toBe(mdFun);
  });

  it('can decode and re-encode a more complex file (only markdown)', async () => {
    const final = encode(decode(onlyMarkdown));
    expect(final).toBe(onlyMarkdown);
  });

  it('can decode and re-encode a file with markdown and code', async () => {
    const final = encode(decode(mdAndCode));
    expect(final).toBe(mdAndCode);
  });
});
