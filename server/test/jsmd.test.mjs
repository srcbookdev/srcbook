import { getRelativeFileContents } from './utils';
import { decode, encode } from '../jsmd.mjs';

describe('encoding and decoding jsmd files', () => {
  let mdFun;

  beforeAll(async () => {
    mdFun = await getRelativeFileContents('jsmd_files/md-fun.jsmd');
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
});
