import { getRelativeFileContents } from './utils';
import { decode, encode } from '../jsmd.mjs';

describe('encoding and decoding jsmd files', () => {
  let mdFun;
  let onlyMarkdown;

  beforeAll(async () => {
    mdFun = await getRelativeFileContents('jsmd_files/md-fun.jsmd');
    onlyMarkdown = await getRelativeFileContents('jsmd_files/only-markdown.jsmd');
  });

  it('can decode a file properly', async () => {
    const cells = decode(mdFun);
    expect(cells).toHaveLength(3);
    expect(cells[0].type).toBe('title');
    expect(cells[0].text).toBe('md-fun');
  });

  it('can decode and re-encode a file', async () => {
    const final = encode(decode(mdFun));
    expect(final).toBe(mdFun);
  });

  it.only('can decode a file with only markdown', async () => {
    console.log(onlyMarkdown);
    const cells = decode(onlyMarkdown);
  });
});
