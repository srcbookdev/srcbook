import { StreamingXMLParser, type TagType } from '../ai/stream-xml-parser.mjs';

describe('parsePlan', () => {
  test('should correctly parse a plan with file and command actions', async () => {
    const tags: TagType[] = [];

    const parser = new StreamingXMLParser({
      onTag: (tag) => {
        tags.push(tag);
      },
    });

    parser.parse('<plan');
    parser.parse('>');
    parser.parse('\n');
    parser.parse('<plan');
    parser.parse('Description');
    parser.parse('>');
    parser.parse('<![');
    parser.parse('CDATA');
    parser.parse('[');
    parser.parse('\n');
    parser.parse('Some');
    parser.parse(' text');
    parser.parse(' goes');
    parser.parse(' here');
    parser.parse('.');
    parser.parse('\n');
    parser.parse(']]>');
    parser.parse('\n');
    parser.parse('</');
    parser.parse('plan');
    parser.parse('Description>');
    parser.parse('\n');
    parser.parse('<action');
    parser.parse(' type');
    parser.parse('=');
    parser.parse('"');
    parser.parse('file"');
    parser.parse('>');
    parser.parse('\n');
    parser.parse('<description');
    parser.parse('>');
    parser.parse('\n');
    parser.parse('<![');
    parser.parse('CDATA');
    parser.parse('[');
    parser.parse('\n');
    parser.parse('Some');
    parser.parse(' text');
    parser.parse(' goes');
    parser.parse(' here');
    parser.parse('.');
    parser.parse('\n');
    parser.parse(']]>');
    parser.parse('\n');
    parser.parse('</');
    parser.parse('description>');
    parser.parse('\n');

    parser.parse('<file');
    parser.parse(' filename');
    parser.parse('=');
    parser.parse('"');
    parser.parse('index');
    parser.parse('.');
    parser.parse('tsx');
    parser.parse('"');
    parser.parse('>');
    parser.parse('\n');
    parser.parse('<![');
    parser.parse('CDATA');
    parser.parse('[');
    parser.parse('\n');
    parser.parse('console');
    parser.parse('.');
    parser.parse('log');
    parser.parse('(');
    parser.parse(')');
    parser.parse(';');
    parser.parse('\n');
    parser.parse(']]>');
    parser.parse('\n');
    parser.parse('</');
    parser.parse('file>');
    parser.parse('\n');

    parser.parse('</');
    parser.parse('action>');
    parser.parse('\n');
    parser.parse('</');
    parser.parse('plan>');
    parser.parse('\n');
    parser.parse('\n');

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
