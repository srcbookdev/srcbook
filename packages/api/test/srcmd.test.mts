import Path from 'path';
import { getRelativeFileContents } from './utils.mjs';
import { decode, encode, decodeDir } from '../srcmd.mjs';
import type { DecodeErrorResult, DecodeSuccessResult } from '../srcmd.mjs';

describe('encoding and decoding srcmd files', () => {
  let srcmd: string;

  beforeAll(async () => {
    srcmd = await getRelativeFileContents('srcmd_files/notebook.srcmd');
  });

  it('is an error when there is no title', () => {
    const result = decode('## Heading 2\n\nFollowed by a paragraph') as DecodeErrorResult;
    expect(result.error).toBe(true);
    expect(result.errors).toEqual(['Document must contain exactly one h1 heading']);
  });

  it('is an error when there are multiple titles', () => {
    const result = decode(
      '# Heading 1\n\nFollowed by a paragraph\n\n# Followed by another heading 1',
    ) as DecodeErrorResult;
    expect(result.error).toBe(true);
    expect(result.errors).toEqual(['Document must contain exactly one h1 heading']);
  });

  it('is an error when there is a heading 6 without a corresponding code block', () => {
    const result = decode(
      '# Heading 1\n\n###### supposed_to_be_a_filename.mjs\n\nBut no code is found.',
    ) as DecodeErrorResult;
    expect(result.error).toBe(true);
    expect(result.errors).toEqual([
      "h6 is reserved for code cells, but no code block followed '###### supposed_to_be_a_filename.mjs'",
    ]);
  });

  it('can decode a well-formed file', () => {
    const result = decode(srcmd) as DecodeSuccessResult;
    expect(result.error).toBe(false);
    expect(result.cells).toEqual([
      { id: expect.any(String), type: 'title', text: 'Notebook title' },
      {
        id: expect.any(String),
        type: 'package.json',
        source: `{\n  "dependencies": {}\n}`,
        filename: 'package.json',
      },
      {
        id: expect.any(String),
        type: 'markdown',
        text: `\n\nOpening paragraph here.\n\n## Section h2\n\nAnother paragraph.\n\nFollowed by:\n\n1. An\n2. Ordered\n3. List\n\n`,
      },
      {
        id: expect.any(String),
        type: 'code',
        source: '// A code snippet here.\nexport function add(a, b) { return a + b }',
        language: 'javascript',
        filename: 'index.mjs',
      },
      {
        id: expect.any(String),
        type: 'markdown',
        text: '\n\n## Another section\n\nDescription goes here. `inline code` works.\n\n```javascript\n// This will render as markdown, not a code cell.\nfoo() + bar()\n```\n\n',
      },
      {
        id: expect.any(String),
        type: 'code',
        source: "import {add} from './index.mjs';\nconst res = add(2, 3);\nconsole.log(res);",
        language: 'javascript',
        filename: 'foo.mjs',
      },
      {
        id: expect.any(String),
        type: 'markdown',
        text: '\n\nParagraph here.\n',
      },
    ]);
  });

  it('can encode cells', () => {
    const result = decode(srcmd) as DecodeSuccessResult;
    expect(result.error).toBe(false);
    expect(encode(result.cells, { inline: true })).toEqual(srcmd);
  });
});

describe('it can decode from directories', () => {
  it('can decode a simple directory with README, package, and one file', async () => {
    const dirPath = Path.resolve(__dirname, 'srcmd_files/mock_notebook_dir/');
    const result = (await decodeDir(dirPath)) as DecodeSuccessResult;
    expect(result.error).toBe(false);
    expect(result.cells).toEqual([
      { id: expect.any(String), type: 'title', text: 'Notebook' },
      {
        id: expect.any(String),
        type: 'package.json',
        source: `{\n  "dependencies": {}\n}\n`,
        filename: 'package.json',
      },
      {
        id: expect.any(String),
        type: 'markdown',
        text: '\n\nWith some words right behind it.\n\n## Markdown cell\n\nWith some **bold** text and some _italic_ text.\n\n> And a quote, why the f\\*\\*\\* not!\n\n',
      },
      {
        id: expect.any(String),
        type: 'code',
        source: 'const foo = 42;\nexport const bar = true;\nconsole.log(foo, bar);\n',
        language: 'javascript',
        filename: 'foo.mjs',
      },
      {
        id: expect.any(String),
        type: 'markdown',
        text: '\n\n```json\n{ "simple": "codeblock" }\n```\n',
      },
    ]);
  });
});
