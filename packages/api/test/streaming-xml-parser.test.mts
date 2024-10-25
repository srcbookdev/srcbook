import fs from 'node:fs';
import Path from 'node:path';
import { XMLStreamParser, type TagType } from '../ai/stream-xml-parser.mjs';

const filepath = new URL(import.meta.url).pathname;

const chunkLines = fs.readFileSync(Path.resolve(filepath, '../plan-chunks.txt'), 'utf-8');
const chunks = chunkLines
  .split('\n')
  .filter((line) => line.trim() !== '')
  .map((chunk) => JSON.parse(chunk).chunk);

describe('parsePlan', () => {
  test('should correctly parse a plan with file and command actions', async () => {
    const tags: TagType[] = [];

    const parser = new XMLStreamParser({
      onTag: (tag) => {
        tags.push(tag);
      },
    });

    chunks.forEach((chunk) => parser.parse(chunk));

    expect(tags).toEqual([
      {
        name: 'planDescription',
        attributes: {},
        content: '\nSome text goes here.\n',
        children: [],
      },
      {
        name: 'action',
        attributes: { type: 'file' },
        content: '',
        children: [
          {
            name: 'description',
            attributes: {},
            content: '\nSome text goes here.\n',
            children: [],
          },
          {
            name: 'file',
            attributes: { filename: 'index.tsx' },
            content: '\nconsole.log();\n',
            children: [],
          },
        ],
      },
    ]);
  });
});
