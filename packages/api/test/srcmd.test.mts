import Path from 'path';
import { getRelativeFileContents } from './utils.mjs';
import { decode, encode, decodeDir } from '../srcmd.mjs';
import type { DecodeErrorResult, DecodeSuccessResult } from '../srcmd/types.mjs';

describe('encoding and decoding srcmd files', () => {
  let srcmd: string;
  const languagePrefix = '<!-- srcbook:{"language": "javascript"} -->\n\n';

  beforeAll(async () => {
    srcmd = await getRelativeFileContents('srcmd_files/srcbook.srcmd');
  });

  it('is an error when there is no title', () => {
    const result = decode(
      languagePrefix +
        '## Heading 2\n\n<details>\n  <summary>package.json</summary>\n\n```json\n{}\n```\n</details>\n\nFollowed by a paragraph',
    ) as DecodeErrorResult;
    expect(result.error).toBe(true);
    expect(result.errors).toEqual(['Document must contain exactly one h1 heading']);
  });

  it('is an error when there is no package.json', () => {
    const result = decode(
      languagePrefix + '# Title\n\nFollowed by a paragraph',
    ) as DecodeErrorResult;
    expect(result.error).toBe(true);
    expect(result.errors).toEqual(['Document must contain exactly one package.json']);
  });

  it('is an error when there are multiple titles', () => {
    const result = decode(
      languagePrefix +
        '# Heading 1\n\n<details>\n  <summary>package.json</summary>\n\n```json\n{}\n```\n</details>\n\nFollowed by a paragraph\n\n# Followed by another heading 1',
    ) as DecodeErrorResult;
    expect(result.error).toBe(true);
    expect(result.errors).toEqual(['Document must contain exactly one h1 heading']);
  });

  it('can decode a well-formed file', () => {
    const result = decode(srcmd) as DecodeSuccessResult;
    expect(result.error).toBe(false);
    expect(result.cells).toEqual([
      { id: expect.any(String), type: 'title', text: 'Srcbook title' },
      {
        id: expect.any(String),
        type: 'package.json',
        source: `{\n  "dependencies": {}\n}`,
        filename: 'package.json',
        status: 'idle',
      },
      {
        id: expect.any(String),
        type: 'markdown',
        text: `Opening paragraph here.\n\n## Section h2\n\nAnother paragraph.\n\nFollowed by:\n\n1. An\n2. Ordered\n3. List`,
      },
      {
        id: expect.any(String),
        type: 'code',
        source: '// A code snippet here.\nexport function add(a, b) { return a + b }',
        language: 'javascript',
        filename: 'index.mjs',
        status: 'idle',
      },
      {
        id: expect.any(String),
        type: 'markdown',
        text: '## Another section\n\nDescription goes here. `inline code` works.\n\n```javascript\n// This will render as markdown, not a code cell.\nfoo() + bar()\n```',
      },
      {
        id: expect.any(String),
        type: 'code',
        source: "import {add} from './index.mjs';\nconst res = add(2, 3);\nconsole.log(res);",
        language: 'javascript',
        filename: 'foo.mjs',
        status: 'idle',
      },
      {
        id: expect.any(String),
        type: 'markdown',
        text: 'Paragraph here.',
      },
    ]);
  });

  it('can encode cells', () => {
    const result = decode(srcmd) as DecodeSuccessResult;
    expect(result.error).toBe(false);
    expect(encode(result.cells, result.metadata, { inline: true })).toEqual(srcmd);
  });
});

describe('it can decode from directories', () => {
  it('can decode a simple directory with README, package, and one file', async () => {
    const dirPath = Path.resolve(__dirname, 'srcmd_files/srcbook_dir/');
    const result = (await decodeDir(dirPath)) as DecodeSuccessResult;
    expect(result.error).toBe(false);
    expect(result.cells).toEqual([
      { id: expect.any(String), type: 'title', text: 'Srcbook' },
      {
        id: expect.any(String),
        type: 'package.json',
        source: `{\n  "dependencies": {}\n}\n`,
        filename: 'package.json',
        status: 'idle',
      },
      {
        id: expect.any(String),
        type: 'markdown',
        text: 'With some words right behind it.\n\n## Markdown cell\n\nWith some **bold** text and some _italic_ text.\n\n> And a quote, why the f\\*\\*\\* not!',
      },
      {
        id: expect.any(String),
        type: 'code',
        source: 'const foo = 42;\nexport const bar = true;\nconsole.log(foo, bar);\n',
        language: 'javascript',
        filename: 'foo.mjs',
        status: 'idle',
      },
      {
        id: expect.any(String),
        type: 'markdown',
        text: '```json\n{ "simple": "codeblock" }\n```',
      },
    ]);
  });
});
